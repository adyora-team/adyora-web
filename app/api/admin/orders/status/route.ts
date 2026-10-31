import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { sendTransactionalEmail, type BrevoTemplateType } from '@/lib/brevo';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleRow?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const orderId = String(body.orderId || '');
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const { data: previousOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!previousOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const nextOrderStatus = body.order_status || previousOrder.order_status;
    const nextPaymentStatus = body.payment_status || previousOrder.payment_status;
    const nextShippingStatus =
      body.shipping_status ?? previousOrder.shipping_status;
    const nextTrackingNumber =
      body.tracking_number ?? previousOrder.tracking_number;
    const nextCourierName = body.courier_name ?? previousOrder.courier_name;
    const nextOrderNotes = body.order_notes ?? previousOrder.order_notes;
    const nextRefundStatus = body.refund_status ?? previousOrder.refund_status;

    const { data: updatedOrder, error: updateErr } = await supabase
      .from('orders')
      .update({
        order_status: nextOrderStatus,
        payment_status: nextPaymentStatus,
        shipping_status: nextShippingStatus,
        tracking_number: nextTrackingNumber,
        courier_name: nextCourierName,
        order_notes: nextOrderNotes,
        refund_status: nextRefundStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (updateErr || !updatedOrder) {
      throw new Error(updateErr?.message || 'Could not update order');
    }

    // Trigger Brevo transactional email when order status changes
    let templateType: BrevoTemplateType | null = null;
    if (
      nextOrderStatus !== previousOrder.order_status ||
      nextPaymentStatus !== previousOrder.payment_status
    ) {
      if (nextOrderStatus === 'Confirmed') templateType = 'order_confirmation';
      else if (nextOrderStatus === 'Shipped') templateType = 'order_shipped';
      else if (nextOrderStatus === 'Delivered') templateType = 'order_delivered';
      else if (nextOrderStatus === 'Cancelled') templateType = 'order_cancelled';
      else if (
        nextOrderStatus === 'Refunded' ||
        nextPaymentStatus === 'Refunded'
      ) {
        templateType = 'refund_confirmation';
      }
    }

    if (templateType) {
      await sendTransactionalEmail({
        toEmail: updatedOrder.customer_email,
        toName: updatedOrder.customer_name,
        templateType,
        orderId: updatedOrder.id,
        variables: {
          customerName: updatedOrder.customer_name,
          orderNumber: updatedOrder.order_number,
          totalAmount: `₹${Number(updatedOrder.total_amount).toLocaleString(
            'en-IN'
          )}`,
          refundAmount: `₹${Number(updatedOrder.total_amount).toLocaleString(
            'en-IN'
          )}`,
          trackingNumber: updatedOrder.tracking_number,
          courierName: updatedOrder.courier_name,
        },
      });
    }

    return NextResponse.json({ order: updatedOrder, emailTriggered: templateType });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update order' },
      { status: 500 }
    );
  }
}

