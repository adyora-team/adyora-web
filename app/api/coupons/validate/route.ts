import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCode = String(body.code || '').trim().toUpperCase();
    const subtotal = Number(body.subtotal || 0);
    const customerEmail = String(body.customerEmail || '').trim().toLowerCase();
    const userId = body.userId ? String(body.userId) : null;

    if (!rawCode) {
      return NextResponse.json({ error: 'Please enter a coupon code.' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', rawCode)
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return NextResponse.json(
        { error: 'Invalid or inactive coupon code.' },
        { status: 404 }
      );
    }

    const now = Date.now();
    if (coupon.start_date && new Date(coupon.start_date).getTime() > now) {
      return NextResponse.json(
        { error: 'This coupon is not yet active.' },
        { status: 400 }
      );
    }

    if (coupon.expiry_date && new Date(coupon.expiry_date).getTime() < now) {
      return NextResponse.json(
        { error: 'This coupon has expired.' },
        { status: 400 }
      );
    }

    if (subtotal < Number(coupon.minimum_order_value || 0)) {
      return NextResponse.json(
        {
          error: `Minimum order value of ₹${Number(
            coupon.minimum_order_value
          ).toLocaleString('en-IN')} required for this coupon.`,
        },
        { status: 400 }
      );
    }

    if (
      coupon.usage_limit !== null &&
      Number(coupon.used_count) >= Number(coupon.usage_limit)
    ) {
      return NextResponse.json(
        { error: 'This coupon has reached its maximum usage limit.' },
        { status: 400 }
      );
    }

    if (coupon.per_customer_limit && (userId || customerEmail)) {
      let usageQuery = supabase
        .from('coupon_usage')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id);

      if (userId) {
        usageQuery = usageQuery.eq('user_id', userId);
      } else if (customerEmail) {
        usageQuery = usageQuery.eq('customer_email', customerEmail);
      }

      const { count } = await usageQuery;
      if ((count || 0) >= Number(coupon.per_customer_limit)) {
        return NextResponse.json(
          { error: 'You have already used this coupon the maximum number of times.' },
          { status: 400 }
        );
      }
    }

    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (subtotal * Number(coupon.discount_amount)) / 100;
      if (coupon.maximum_discount !== null) {
        discountAmount = Math.min(discountAmount, Number(coupon.maximum_discount));
      }
    } else {
      discountAmount = Number(coupon.discount_amount);
    }

    discountAmount = Math.min(subtotal, Math.round(discountAmount * 100) / 100);

    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discount_type,
      discountAmount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Coupon validation failed.' },
      { status: 500 }
    );
  }
}

