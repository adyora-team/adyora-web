import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/admin';
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay';
import { sendTransactionalEmail } from '@/lib/brevo';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const eventId = req.headers.get('x-razorpay-event-id') || '';

    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = String(payload.event || '');
    const paymentEntity = payload?.payload?.payment?.entity;
    const razorpayOrderId = paymentEntity?.order_id;
    const razorpayPaymentId = paymentEntity?.id;

    if (!razorpayOrderId) {
      return NextResponse.json({ received: true });
    }

    const supabaseAdmin = createServiceRoleClient();

    // Prevent duplicate webhook processing
    if (eventId) {
      const { data: existingEvent } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('webhook_event_id', eventId)
        .single();

      if (existingEvent) {
        return NextResponse.json({ received: true, duplicate: true });
      }
    }

    const { data: paymentRow } = await supabaseAdmin
      .from('payments')
      .select('id, order_id, status')
      .eq('razorpay_order_id', razorpayOrderId)
      .single();

    if (!paymentRow) {
      return NextResponse.json({ received: true });
    }

    if (eventType === 'payment.captured' && paymentRow.status !== 'captured') {
      await supabaseAdmin
        .from('payments')
        .update({
          razorpay_payment_id: razorpayPaymentId || '',
          status: 'captured',
          webhook_event_id: eventId || null,
          raw_payload: payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRow.id);

      const { data: order } = await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'Paid',
          order_status: 'Confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRow.order_id)
        .select('*')
        .single();

      if (order) {
        await sendTransactionalEmail({
          toEmail: order.customer_email,
          toName: order.customer_name,
          templateType: 'order_confirmation',
          orderId: order.id,
          variables: {
            customerName: order.customer_name,
            orderNumber: order.order_number,
            totalAmount: `₹${Number(order.total_amount).toLocaleString('en-IN')}`,
          },
        });
      }
    } else if (eventType === 'payment.failed' && paymentRow.status !== 'captured') {
      await supabaseAdmin
        .from('payments')
        .update({
          razorpay_payment_id: razorpayPaymentId || '',
          status: 'failed',
          webhook_event_id: eventId || null,
          raw_payload: payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRow.id);

      await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'Failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRow.order_id);
    } else if (eventType === 'refund.processed') {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'refunded',
          webhook_event_id: eventId || null,
          raw_payload: payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRow.id);

      const { data: order } = await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'Refunded',
          order_status: 'Refunded',
          refund_status: 'Processed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRow.order_id)
        .select('*')
        .single();

      if (order) {
        await sendTransactionalEmail({
          toEmail: order.customer_email,
          toName: order.customer_name,
          templateType: 'refund_confirmation',
          orderId: order.id,
          variables: {
            customerName: order.customer_name,
            orderNumber: order.order_number,
            refundAmount: `₹${Number(order.total_amount).toLocaleString('en-IN')}`,
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook processing error' },
      { status: 500 }
    );
  }
}

