import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/admin';
import { createRazorpayOrder } from '@/lib/razorpay';
import { getWebsiteSettings } from '@/lib/cms';

interface CheckoutCartItemInput {
  productId: string;
  variantId?: string | null;
  size?: string;
  colour?: string;
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: CheckoutCartItemInput[] = Array.isArray(body.items)
      ? body.items
      : [];
    const shippingAddress = body.shippingAddress || {};
    const couponCode = String(body.couponCode || '').trim().toUpperCase();
    const retryOrderId = body.retryOrderId ? String(body.retryOrderId) : null;

    const cookieStore = await cookies();
    const supabaseUserClient = createClient(cookieStore);
    const {
      data: { user },
    } = await supabaseUserClient.auth.getUser();

    const supabaseAdmin = createServiceRoleClient();

    // Support retry payment on an existing Pending order
    if (retryOrderId) {
      const { data: existingOrder, error: orderErr } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', retryOrderId)
        .single();

      if (orderErr || !existingOrder) {
        return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
      }
      if (existingOrder.payment_status === 'Paid') {
        return NextResponse.json(
          { error: 'This order is already paid.' },
          { status: 400 }
        );
      }

      const rzpOrder = await createRazorpayOrder({
        amountInRupees: Number(existingOrder.total_amount),
        currency: 'INR',
        receipt: existingOrder.order_number,
        notes: { order_id: existingOrder.id },
      });

      await supabaseAdmin.from('payments').insert({
        order_id: existingOrder.id,
        razorpay_order_id: rzpOrder.id,
        amount: Number(existingOrder.total_amount),
        currency: 'INR',
        status: 'created',
      });

      return NextResponse.json({
        orderId: existingOrder.id,
        orderNumber: existingOrder.order_number,
        razorpayOrderId: rzpOrder.id,
        amountInPaise: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId:
          process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      });
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
    }

    if (
      !shippingAddress.full_name ||
      !shippingAddress.email ||
      !shippingAddress.phone ||
      !shippingAddress.address_line1 ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.postal_code
    ) {
      return NextResponse.json(
        { error: 'Please complete all required shipping address fields.' },
        { status: 400 }
      );
    }

    // 1. Validate product prices & stock strictly from Supabase
    const productIds = Array.from(new Set(items.map((i) => i.productId)));
    const { data: dbProducts, error: prodErr } = await supabaseAdmin
      .from('products')
      .select(
        'id, name, sku, selling_price, stock_quantity, is_published, product_images(image_url, display_order), product_variants(id, sku, size, colour_name, selling_price_override, stock_quantity, is_active)'
      )
      .in('id', productIds);

    if (prodErr || !dbProducts || dbProducts.length === 0) {
      return NextResponse.json(
        { error: 'Could not verify cart products from database.' },
        { status: 400 }
      );
    }

    let verifiedSubtotal = 0;
    const verifiedOrderItems: Array<{
      product_id: string;
      variant_id: string | null;
      product_name: string;
      sku: string;
      size: string;
      colour: string;
      image_url: string;
      unit_price: number;
      quantity: number;
      line_total: number;
    }> = [];

    for (const item of items) {
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const product = dbProducts.find((p) => p.id === item.productId);
      if (!product || !product.is_published) {
        return NextResponse.json(
          { error: 'One or more products in your bag are no longer available.' },
          { status: 400 }
        );
      }

      const variants = Array.isArray(product.product_variants)
        ? product.product_variants
        : [];
      const variant = item.variantId
        ? variants.find((v: { id: string }) => v.id === item.variantId)
        : undefined;

      const availableStock = variant
        ? Number(variant.stock_quantity)
        : Number(product.stock_quantity);

      if (availableStock < qty) {
        return NextResponse.json(
          {
            error: `Insufficient stock for "${product.name}". Available: ${availableStock}.`,
          },
          { status: 400 }
        );
      }

      const unitPrice =
        variant?.selling_price_override !== null &&
        variant?.selling_price_override !== undefined
          ? Number(variant.selling_price_override)
          : Number(product.selling_price);

      const lineTotal = Math.round(unitPrice * qty * 100) / 100;
      verifiedSubtotal += lineTotal;

      const sortedImages = Array.isArray(product.product_images)
        ? [...product.product_images].sort(
            (a, b) => (a.display_order || 0) - (b.display_order || 0)
          )
        : [];

      verifiedOrderItems.push({
        product_id: product.id,
        variant_id: variant?.id || null,
        product_name: product.name,
        sku: variant?.sku || product.sku,
        size: item.size || variant?.size || '',
        colour: item.colour || variant?.colour_name || '',
        image_url: sortedImages[0]?.image_url || '',
        unit_price: unitPrice,
        quantity: qty,
        line_total: lineTotal,
      });
    }

    // 2. Validate Coupon Server-Side if provided
    let discountAmount = 0;
    let appliedCouponId: string | null = null;
    let appliedCouponCode = '';

    if (couponCode) {
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', couponCode)
        .eq('is_active', true)
        .single();

      const now = Date.now();
      const validTime =
        (!coupon?.start_date || new Date(coupon.start_date).getTime() <= now) &&
        (!coupon?.expiry_date || new Date(coupon.expiry_date).getTime() >= now);
      const validLimit =
        coupon?.usage_limit === null ||
        Number(coupon?.used_count || 0) < Number(coupon?.usage_limit || 0);

      if (
        coupon &&
        validTime &&
        validLimit &&
        verifiedSubtotal >= Number(coupon.minimum_order_value || 0)
      ) {
        if (coupon.discount_type === 'percentage') {
          discountAmount =
            (verifiedSubtotal * Number(coupon.discount_amount)) / 100;
          if (coupon.maximum_discount !== null) {
            discountAmount = Math.min(
              discountAmount,
              Number(coupon.maximum_discount)
            );
          }
        } else {
          discountAmount = Number(coupon.discount_amount);
        }
        discountAmount = Math.min(
          verifiedSubtotal,
          Math.round(discountAmount * 100) / 100
        );
        appliedCouponId = coupon.id;
        appliedCouponCode = coupon.code;
      }
    }

    // 3. Calculate Tax & Shipping from Website Settings
    const settings = await getWebsiteSettings();
    const taxableBase = Math.max(0, verifiedSubtotal - discountAmount);
    const taxAmount =
      Math.round(
        ((taxableBase * Number(settings.tax_percentage || 0)) / 100) * 100
      ) / 100;
    const shippingAmount =
      taxableBase >= Number(settings.free_shipping_threshold || 1999)
        ? 0
        : Number(settings.shipping_flat_rate || 0);
    const totalAmount =
      Math.round((taxableBase + taxAmount + shippingAmount) * 100) / 100;

    // 4. Create Pending Order in Supabase
    const orderNumber = `ADY-${Date.now().toString().slice(-6)}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const { data: createdOrder, error: createOrderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: user?.id || null,
        customer_name: String(shippingAddress.full_name).trim(),
        customer_email: String(shippingAddress.email).trim().toLowerCase(),
        customer_phone: String(shippingAddress.phone).trim(),
        shipping_address: {
          full_name: String(shippingAddress.full_name).trim(),
          phone: String(shippingAddress.phone).trim(),
          address_line1: String(shippingAddress.address_line1).trim(),
          address_line2: String(shippingAddress.address_line2 || '').trim(),
          city: String(shippingAddress.city).trim(),
          state: String(shippingAddress.state).trim(),
          postal_code: String(shippingAddress.postal_code).trim(),
          country: String(shippingAddress.country || 'India').trim(),
        },
        subtotal: verifiedSubtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        shipping_amount: shippingAmount,
        total_amount: totalAmount,
        coupon_id: appliedCouponId,
        coupon_code: appliedCouponCode,
        payment_status: 'Pending',
        order_status: 'Pending',
        shipping_status: 'Not Shipped',
      })
      .select('*')
      .single();

    if (createOrderErr || !createdOrder) {
      throw new Error(createOrderErr?.message || 'Failed to create pending order.');
    }

    const orderItemsPayload = verifiedOrderItems.map((oi) => ({
      ...oi,
      order_id: createdOrder.id,
    }));
    await supabaseAdmin.from('order_items').insert(orderItemsPayload);

    // 5. Create Razorpay Order Server-Side
    const razorpayOrder = await createRazorpayOrder({
      amountInRupees: totalAmount,
      currency: settings.currency_code || 'INR',
      receipt: orderNumber,
      notes: {
        order_id: createdOrder.id,
        order_number: orderNumber,
        customer_email: createdOrder.customer_email,
      },
    });

    // 6. Store Payment Record in Supabase
    await supabaseAdmin.from('payments').insert({
      order_id: createdOrder.id,
      razorpay_order_id: razorpayOrder.id,
      amount: totalAmount,
      currency: razorpayOrder.currency,
      status: 'created',
    });

    return NextResponse.json({
      orderId: createdOrder.id,
      orderNumber: createdOrder.order_number,
      razorpayOrderId: razorpayOrder.id,
      amountInPaise: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId:
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Checkout order initialization failed.',
      },
      { status: 500 }
    );
  }
}

