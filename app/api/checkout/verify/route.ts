import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createServiceRoleClient } from '@/utils/supabase/admin';
import { verifyRazorpayPaymentSignature } from '@/lib/razorpay';
import { sendTransactionalEmail } from '@/lib/brevo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = String(body.orderId || '');
    const razorpayOrderId = String(body.razorpay_order_id || '');
    const razorpayPaymentId = String(body.razorpay_payment_id || '');
    const razorpaySignature = String(body.razorpay_signature || '');

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: 'Missing required payment verification parameters.' },
        { status: 400 }
      );
    }

    // 1. Cryptographically verify Razorpay signature server-side
    const isValid = verifyRazorpayPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    const supabaseAdmin = createServiceRoleClient();

    if (!isValid) {
      await supabaseAdmin
        .from('payments')
        .update({
          razorpay_payment_id: razorpayPaymentId,
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('razorpay_order_id', razorpayOrderId);

      await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'Failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      return NextResponse.json(
        { error: 'Invalid payment signature verification.' },
        { status: 400 }
      );
    }

    // 2. Fetch order and ensure we don't double-process stock deduction
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (order.payment_status === 'Paid') {
      return NextResponse.json({
        verified: true,
        orderNumber: order.order_number,
        orderId: order.id,
      });
    }

    // 3. Update payment & order status
    await supabaseAdmin
      .from('payments')
      .update({
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        status: 'captured',
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_order_id', razorpayOrderId);

    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'Paid',
        order_status: 'Confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // 4. Deduct inventory stock for each order item
    const items = Array.isArray(order.order_items) ? order.order_items : [];
    for (const item of items) {
      if (item.product_id) {
        const { data: prod } = await supabaseAdmin
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (prod) {
          const nextStock = Math.max(
            0,
            Number(prod.stock_quantity) - Number(item.quantity)
          );
          await supabaseAdmin
            .from('products')
            .update({ stock_quantity: nextStock })
            .eq('id', item.product_id);
        }
      }

      if (item.variant_id) {
        const { data: variant } = await supabaseAdmin
          .from('product_variants')
          .select('stock_quantity')
          .eq('id', item.variant_id)
          .single();

        if (variant) {
          const nextVarStock = Math.max(
            0,
            Number(variant.stock_quantity) - Number(item.quantity)
          );
          await supabaseAdmin
            .from('product_variants')
            .update({ stock_quantity: nextVarStock })
            .eq('id', item.variant_id);
        }
      }
    }

    // 5. Record coupon usage if coupon was applied
    if (order.coupon_id) {
      await supabaseAdmin.from('coupon_usage').insert({
        coupon_id: order.coupon_id,
        user_id: order.user_id,
        customer_email: order.customer_email,
        order_id: order.id,
      });

      const { data: c } = await supabaseAdmin
        .from('coupons')
        .select('used_count')
        .eq('id', order.coupon_id)
        .single();
      if (c) {
        await supabaseAdmin
          .from('coupons')
          .update({ used_count: Number(c.used_count || 0) + 1 })
          .eq('id', order.coupon_id);
      }
    }

    revalidateTag('products');

    // 6. Send Order Confirmation & Payment Confirmation emails via Brevo
    const formattedTotal = `₹${Number(order.total_amount).toLocaleString('en-IN')}`;
    await Promise.allSettled([
      sendTransactionalEmail({
        toEmail: order.customer_email,
        toName: order.customer_name,
        templateType: 'order_confirmation',
        orderId: order.id,
        variables: {
          customerName: order.customer_name,
          orderNumber: order.order_number,
          totalAmount: formattedTotal,
        },
      }),
      sendTransactionalEmail({
        toEmail: order.customer_email,
        toName: order.customer_name,
        templateType: 'payment_confirmation',
        orderId: order.id,
        variables: {
          customerName: order.customer_name,
          orderNumber: order.order_number,
          totalAmount: formattedTotal,
        },
      }),
    ]);

    return NextResponse.json({
      verified: true,
      orderId: order.id,
      orderNumber: order.order_number,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Payment verification failed.',
      },
      { status: 500 }
    );
  }
}

