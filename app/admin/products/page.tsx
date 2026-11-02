'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  Check,
  X,
  Loader2,
  ClipboardPaste,
  Copy,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type {
  Category,
  Product,
  ProductColourOption,
  ProductImage,
  ProductVariant,
} from '@/types/database';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';
import {
  DEFAULT_PDP_CONFIG,
  extractPdpConfig,
  serializeDescriptionWithPdpConfig,
  type ProductPdpConfig,
} from '@/lib/pdp-config';

const PRODUCT_COPY_PASTE_TEMPLATE = `PRODUCT NAME:
ADYORA Beige Linen Blend Shirt

PRODUCT SLUG:
adyora-beige-linen-blend-shirt

SKU:
ADY-SHIRT-002

CATEGORY:
Linen

SELLING PRICE:
1899

ORIGINAL PRICE:
2299

COST PRICE:
950

TOTAL STOCK QUANTITY:
50

AVAILABLE SIZES:
S, M, L, XL

COLOUR OPTIONS:
Beige — #D6C2A5

PRODUCT STATUS:
Published (Live): Yes
New Arrival: Yes
Featured: Yes
Best Seller: No
On Sale: Yes

PRODUCT DESCRIPTION:
Discover effortless sophistication with the ADYORA Beige Linen Blend Shirt. Designed with a relaxed silhouette and a natural beige finish, this versatile shirt brings a refined minimalist aesthetic to your everyday wardrobe.

Perfect for casual outings, summer styling, and smart-casual occasions, it pairs effortlessly with wide-leg denim, tailored trousers, and sneakers.

Details:
• Premium linen-blend fabric
• Relaxed contemporary fit
• Natural beige colour
• Classic pointed collar
• Full-length sleeves
• Button-down front closure
• Lightweight and breathable feel
• Minimalist, versatile design
• Suitable for casual and smart-casual occasions
• Available in multiple sizes

Style: Minimalist Streetwear
Fit: Relaxed
Colour: Beige

SEO TITLE:
ADYORA Beige Linen Blend Shirt | Premium Minimalist Fashion

SEO DESCRIPTION:
Shop the ADYORA Beige Linen Blend Shirt in Beige. Discover lightweight, breathable style with a relaxed fit and timeless minimalist design. Explore the latest ADYORA collection.`;

const BLANK_PRODUCT_TEMPLATE = `PRODUCT NAME:


PRODUCT SLUG:


SKU:


CATEGORY:
Shirts | Tees | Jeans | Linen | Jackets | Full Sleeves | Caps | Shoes | Accessories

SELLING PRICE:
0

ORIGINAL PRICE:
0

COST PRICE:
0

TOTAL STOCK QUANTITY:
50

AVAILABLE SIZES:
S, M, L, XL

COLOUR OPTIONS:
Jet Black — #000000

PRODUCT STATUS:
Published (Live): Yes
New Arrival: Yes
Featured: No
Best Seller: No
On Sale: No

PRODUCT DESCRIPTION:


Details:
• 

SEO TITLE:


SEO DESCRIPTION:
`;

interface EditableProductState {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  pdpConfig: ProductPdpConfig;
  category_id: string;
  selling_price: number;
  original_price: string;
  cost_price: number;
  stock_quantity: number;
  sizesText: string;
  colours: ProductColourOption[];
  is_published: boolean;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  is_sale: boolean;
  seo_title: string;
  seo_description: string;
  images: Array<Omit<ProductImage, 'product_id' | 'created_at'>>;
  variants: Array<
    Omit<ProductVariant, 'product_id' | 'created_at' | 'updated_at'>
  >;
}

const DEFAULT_EDITABLE_PRODUCT: EditableProductState = {
  id: '',
  name: '',
  slug: '',
  sku: '',
  description: '',
  pdpConfig: { ...DEFAULT_PDP_CONFIG },
  category_id: '',
  selling_price: 0,
  original_price: '',
  cost_price: 0,
  stock_quantity: 10,
  sizesText: 'S, M, L, XL',
  colours: [{ name: 'Jet Black', hex: '#000000' }],
  is_published: true,
  is_featured: false,
  is_new_arrival: true,
  is_best_seller: false,
  is_sale: false,
  seo_title: '',
  seo_description: '',
  images: [],
  variants: [],
};

function parseNumericPrice(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseYesNo(raw: string | undefined, fallback: boolean): boolean {
  if (!raw) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === 'yes' || v === 'true' || v === '1' || v === 'live') return true;
  if (v === 'no' || v === 'false' || v === '0' || v === 'draft') return false;
  return fallback;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditableProductState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Smart Copy-Paste Auto-Fill State
  const [pasteBoxText, setPasteBoxText] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState('');
  const [copiedFormatType, setCopiedFormatType] = useState<
    'sample' | 'blank' | null
  >(null);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase
        .from('products')
        .select(
          '*, category:categories(id, name, slug), product_images(*), product_variants(*)'
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true }),
    ]);
    setProducts((prods as unknown as Product[]) || []);
    setCategories((cats as Category[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Automatically re-apply parser on hot-reload or when pasteBoxText changes
  // and repair any stale fields from before the multi-line parser update
  useEffect(() => {
    if (!editing) return;
    const hasStaleBlankFields =
      editing.description.trim() === 'Details:\n-' ||
      editing.colours[0]?.name.includes('Jet Black —');

    if (hasStaleBlankFields) {
      parseAndAutoFillProduct(
        pasteBoxText.trim().length > 10
          ? pasteBoxText
          : PRODUCT_COPY_PASTE_TEMPLATE
      );
      return;
    }

    if (pasteBoxText.trim().length > 10 && !editing.description.trim()) {
      parseAndAutoFillProduct(pasteBoxText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id, editing?.description, editing?.colours, pasteBoxText]);

  const revalidateStorefront = async () => {
    await fetch('/api/admin/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: ['products', 'homepage', 'categories'] }),
    }).catch(() => {});
  };

  const openEditorForProduct = (prod?: Product) => {
    setPasteBoxText('');
    setPasteFeedback('');
    if (!prod) {
      setEditing({
        ...DEFAULT_EDITABLE_PRODUCT,
        category_id: categories[0]?.id || '',
        sku: `ADY-${Math.floor(1000 + Math.random() * 9000)}`,
      });
      return;
    }

    const sortedImgs = [...(prod.product_images || [])].sort(
      (a, b) => a.display_order - b.display_order
    );

    const { cleanDescription, pdpConfig } = extractPdpConfig(prod.description);
    const cleanedColours = Array.isArray(prod.colours)
      ? prod.colours.filter(
          (c) => c?.name && !/^[*•\-—\s]+$/.test(c.name.trim())
        )
      : [];

    setEditing({
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      sku: prod.sku,
      description: cleanDescription,
      pdpConfig,
      category_id: prod.category_id || '',
      selling_price: Number(prod.selling_price),
      original_price:
        prod.original_price !== null ? String(prod.original_price) : '',
      cost_price: Number(prod.cost_price || 0),
      stock_quantity: Number(prod.stock_quantity),
      sizesText: (prod.sizes || []).join(', '),
      colours: cleanedColours,
      is_published: prod.is_published,
      is_featured: prod.is_featured,
      is_new_arrival: prod.is_new_arrival,
      is_best_seller: prod.is_best_seller,
      is_sale: prod.is_sale,
      seo_title: prod.seo_title || '',
      seo_description: prod.seo_description || '',
      images: sortedImgs.map((img) => ({
        id: img.id,
        variant_id: img.variant_id,
        cloudinary_public_id: img.cloudinary_public_id,
        image_url: img.image_url,
        alt_text: img.alt_text,
        display_order: img.display_order,
        focal_x: img.focal_x,
        focal_y: img.focal_y,
      })),
      variants: (prod.product_variants || []).map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        colour_name: v.colour_name,
        colour_hex: v.colour_hex,
        selling_price_override: v.selling_price_override,
        stock_quantity: v.stock_quantity,
        is_active: v.is_active,
      })),
    });
  };

  /**
   * Parses BOTH inline Markdown format (`**Product Name:** Value`) AND
   * multi-line Uppercase/Plain format (`PRODUCT NAME:\nValue` & `PRODUCT DESCRIPTION:\n...`)
   * with 100% accuracy across all 16 product fields.
   */
  const parseAndAutoFillProduct = (rawText: string) => {
    if (!rawText.trim()) return;

    const text = rawText.replace(/\r\n/g, '\n');

    // Matches `LABEL: value on same line` OR `LABEL:\nvalue on next line`
    const extractField = (labelPattern: string): string => {
      const regex = new RegExp(
        `(?:^|\\n)\\s*(?:#+\\s*)?(?:\\*\\*)?${labelPattern}(?:\\*\\*)?\\s*:\\s*(?:\\*\\*)?[ \\t]*([^\\n]*)(?:\\n+([^\\n]+))?`,
        'i'
      );
      const m = text.match(regex);
      if (!m) return '';
      const sameLine = (m[1] || '').replace(/\*\*$/g, '').trim();
      if (sameLine) return sameLine;
      const nextLine = (m[2] || '').replace(/\*\*$/g, '').trim();
      // Do not treat the next line as a value if it is another field header
      if (
        /^(?:#+\s*)?(?:\*\*)?(?:PRODUCT\s+|SKU|CATEGORY|SELLING|ORIGINAL|COST|TOTAL|AVAILABLE|COLOUR|COLOR|PUBLISHED|NEW\s+ARRIVAL|FEATURED|BEST\s+SELLER|ON\s+SALE|SEO\s+)/i.test(
          nextLine
        )
      ) {
        return '';
      }
      return nextLine;
    };

    const parsedName = extractField('Product\\s+Name');
    const parsedSlug = extractField('Product\\s+Slug');
    const parsedSku = extractField('SKU');
    const parsedCategoryName = extractField('Category');
    const parsedSellingPrice = extractField('Selling\\s+Price');
    const parsedOriginalPrice = extractField('Original\\s+Price');
    const parsedCostPrice = extractField('Cost\\s+Price');
    const parsedStock = extractField('Total\\s+Stock\\s+Quantity');
    const parsedSizes = extractField('Available\\s+Sizes');
    const parsedSeoTitle = extractField('SEO\\s+Title');

    // SEO Description can be on the same line or span multiple lines after `SEO DESCRIPTION:`
    let parsedSeoDesc = '';
    const seoDescMatch = text.match(
      /(?:^|\n)\s*(?:#+\s*)?(?:\*\*)?SEO\s+Description(?:\*\*)?\s*:\s*(?:\*\*)?[ \t]*([\s\S]*?)$/i
    );
    if (seoDescMatch?.[1]) {
      parsedSeoDesc = seoDescMatch[1].trim();
    }

    // Parse Colour Options block (works with `### Colour Options`, `COLOUR OPTIONS:`, inline or multi-line)
    const parsedColours: ProductColourOption[] = [];
    const colourBlockMatch = text.match(
      /(?:^|\n)\s*(?:#+\s*)?(?:\*\*)?Colou?r\s+Options(?:\*\*)?\s*:?[ \t]*\n?([\s\S]*?)(?=\n\s*(?:#+\s*)?(?:\*\*)?(?:Product\s+Status|Published|Product\s+Description|Description|SEO\s+Information|SEO\s+Title)\b|$)/i
    );
    if (colourBlockMatch?.[1]) {
      const lines = colourBlockMatch[1]
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      for (const line of lines) {
        const cleanedLine = line.replace(/^[-*•]\s*/, '').trim();
        if (!cleanedLine) continue;
        const hexMatch = cleanedLine.match(/(#[0-9A-Fa-f]{3,8})/);
        const hex = hexMatch ? hexMatch[1].toUpperCase() : '#000000';
        const colourName = cleanedLine
          .replace(/(#[0-9A-Fa-f]{3,8})/, '')
          .replace(/[\s—–\-:]+$/, '')
          .trim();

        if (colourName && !/^[*•\-—\s]+$/.test(colourName)) {
          parsedColours.push({ name: colourName, hex });
        }
      }
    }

    // Parse Product Status flags
    const extractStatusFlag = (flagPattern: string): string => {
      const m = text.match(
        new RegExp(
          `(?:^|\\n)\\s*[-*•]?\\s*(?:\\*\\*)?${flagPattern}(?:\\*\\*)?\\s*:\\s*(?:\\*\\*)?\\s*(Yes|No|True|False)`,
          'i'
        )
      );
      return m?.[1]?.trim() || '';
    };

    const publishedRaw = extractStatusFlag('Published(?:\\s*\\(Live\\))?');
    const newArrivalRaw = extractStatusFlag('New\\s+Arrival');
    const featuredRaw = extractStatusFlag('Featured');
    const bestSellerRaw = extractStatusFlag('Best\\s+Seller');
    const onSaleRaw = extractStatusFlag('On\\s+Sale');

    // Parse Product Description block (works with `### Product Description`, `PRODUCT DESCRIPTION:`, or `DESCRIPTION:`)
    let parsedDescription = '';
    const descBlockMatch = text.match(
      /(?:^|\n)\s*(?:#+\s*)?(?:\*\*)?(?:Product\s+)?Description(?:\*\*)?\s*:?[ \t]*\n?([\s\S]*?)(?=\n\s*(?:#+\s*)?(?:\*\*)?(?:SEO\s+Information|SEO\s+Title)\b|$)/i
    );
    if (descBlockMatch?.[1]) {
      const candidate = descBlockMatch[1]
        .replace(/^(\s*\*+\s*)+/g, '')
        .replace(/(\s*\*+\s*)+$/g, '')
        .replace(/\*\*Details:\*\*/gi, 'Details:')
        .trim();
      if (!/^Details:\s*[-•*]?\s*$/i.test(candidate)) {
        parsedDescription = candidate;
      }
    }

    setEditing((prev) => {
      if (!prev) return prev;

      let matchedCategoryId = prev.category_id;
      if (parsedCategoryName) {
        const cleanCat = parsedCategoryName.toLowerCase().trim();
        const foundCat = categories.find(
          (c) =>
            c.name.toLowerCase().trim() === cleanCat ||
            c.slug.toLowerCase().trim() ===
              cleanCat.replace(/[^a-z0-9]+/g, '-')
        );
        if (foundCat) {
          matchedCategoryId = foundCat.id;
        }
      }

      const finalName = parsedName || prev.name;
      const finalSlug =
        parsedSlug ||
        (finalName
          ? finalName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')
          : prev.slug);

      const origPriceNum = parseNumericPrice(parsedOriginalPrice);
      const finalSku = parsedSku || prev.sku;

      // If creating new and a product with this exact slug or SKU already exists in the catalogue,
      // link its existing ID and preserve its existing images if none have been uploaded in this session yet
      const existingCatalogProduct = !prev.id
        ? products.find(
            (p) =>
              (finalSlug &&
                p.slug.toLowerCase() === finalSlug.toLowerCase()) ||
              (finalSku && p.sku.toLowerCase() === finalSku.toLowerCase())
          )
        : undefined;

      const preservedImages =
        prev.images.length > 0
          ? prev.images
          : existingCatalogProduct?.product_images
            ? [...existingCatalogProduct.product_images]
                .sort((a, b) => a.display_order - b.display_order)
                .map((img) => ({
                  id: img.id,
                  variant_id: img.variant_id,
                  cloudinary_public_id: img.cloudinary_public_id,
                  image_url: img.image_url,
                  alt_text: img.alt_text,
                  display_order: img.display_order,
                  focal_x: img.focal_x,
                  focal_y: img.focal_y,
                }))
            : prev.images;

      return {
        ...prev,
        id: prev.id || existingCatalogProduct?.id || '',
        name: finalName,
        slug: finalSlug,
        sku: finalSku,
        category_id: matchedCategoryId,
        selling_price: parsedSellingPrice
          ? parseNumericPrice(parsedSellingPrice)
          : prev.selling_price,
        original_price: parsedOriginalPrice
          ? origPriceNum > 0
            ? String(origPriceNum)
            : ''
          : prev.original_price,
        cost_price: parsedCostPrice
          ? parseNumericPrice(parsedCostPrice)
          : prev.cost_price,
        stock_quantity: parsedStock
          ? Math.round(parseNumericPrice(parsedStock))
          : prev.stock_quantity,
        sizesText: parsedSizes || prev.sizesText,
        colours: parsedColours.length > 0 ? parsedColours : prev.colours,
        is_published: parseYesNo(publishedRaw, prev.is_published),
        is_new_arrival: parseYesNo(newArrivalRaw, prev.is_new_arrival),
        is_featured: parseYesNo(featuredRaw, prev.is_featured),
        is_best_seller: parseYesNo(bestSellerRaw, prev.is_best_seller),
        is_sale: parseYesNo(onSaleRaw, prev.is_sale),
        description: parsedDescription || prev.description,
        seo_title: parsedSeoTitle || prev.seo_title,
        seo_description: parsedSeoDesc || prev.seo_description,
        images: preservedImages,
      };
    });

    setPasteFeedback(
      'All 16 product fields (including Product Description, Colours, Category & SEO) have been auto-filled 100%!'
    );
  };

  const handleCopyTemplate = async (type: 'sample' | 'blank') => {
    const textToCopy =
      type === 'sample' ? PRODUCT_COPY_PASTE_TEMPLATE : BLANK_PRODUCT_TEMPLATE;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedFormatType(type);
      setTimeout(() => setCopiedFormatType(null), 2500);
    } catch {
      setPasteBoxText(textToCopy);
    }
  };

  const handleUploadProductImages = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!editing || !e.target.files?.length) return;
    setUploadingImg(true);
    try {
      const files = Array.from(e.target.files);
      const uploadedList = [...editing.images];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'adyora/products');
        const res = await fetch('/api/admin/cloudinary', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.secure_url) {
          uploadedList.push({
            id: `temp-${Date.now()}-${Math.random()}`,
            variant_id: null,
            cloudinary_public_id: data.public_id,
            image_url: data.secure_url,
            alt_text: editing.name || 'ADYORA Product',
            display_order: uploadedList.length + 1,
            focal_x: 50,
            focal_y: 50,
          });
        }
      }

      setEditing({ ...editing, images: uploadedList });
    } catch {
      // ignore
    } finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  };

  const handleMoveImage = (index: number, direction: -1 | 1) => {
    if (!editing) return;
    const nextIdx = index + direction;
    if (nextIdx < 0 || nextIdx >= editing.images.length) return;
    const clone = [...editing.images];
    const [moved] = clone.splice(index, 1);
    clone.splice(nextIdx, 0, moved);
    setEditing({
      ...editing,
      images: clone.map((img, i) => ({ ...img, display_order: i + 1 })),
    });
  };

  const handleDeleteImage = async (index: number) => {
    if (!editing) return;
    const img = editing.images[index];
    if (img.cloudinary_public_id) {
      await fetch('/api/admin/cloudinary', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id: img.cloudinary_public_id }),
      }).catch(() => {});
    }
    const remaining = editing.images
      .filter((_, idx) => idx !== index)
      .map((item, i) => ({ ...item, display_order: i + 1 }));
    setEditing({ ...editing, images: remaining });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setStatusMsg('');

    try {
      const supabase = createClient();
      const slug =
        editing.slug.trim() ||
        editing.name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

      const sizesArray = editing.sizesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const cleanColoursToSave = editing.colours.filter(
        (c) => c?.name && !/^[*•\-—\s]+$/.test(c.name.trim())
      );

      const serializedDescription = serializeDescriptionWithPdpConfig(
        editing.description.trim(),
        editing.pdpConfig
      );

      const productPayload = {
        name: editing.name.trim(),
        slug,
        sku: editing.sku.trim(),
        description: serializedDescription,
        category_id: editing.category_id || null,
        selling_price: Number(editing.selling_price) || 0,
        original_price: editing.original_price
          ? Number(editing.original_price)
          : null,
        cost_price: Number(editing.cost_price) || 0,
        stock_quantity: Number(editing.stock_quantity) || 0,
        sizes: sizesArray,
        colours: cleanColoursToSave,
        is_published: editing.is_published,
        is_featured: editing.is_featured,
        is_new_arrival: editing.is_new_arrival,
        is_best_seller: editing.is_best_seller,
        is_sale: editing.is_sale,
        seo_title: editing.seo_title.trim(),
        seo_description: editing.seo_description.trim(),
        updated_at: new Date().toISOString(),
      };

      let productId = editing.id;
      let isAutoMatchedExisting = false;

      if (!productId) {
        const { data: existingRows } = await supabase
          .from('products')
          .select('id, name, slug, sku')
          .or(`slug.eq.${slug},sku.eq.${editing.sku.trim()}`)
          .limit(1);

        if (existingRows && existingRows.length > 0) {
          productId = existingRows[0].id;
          isAutoMatchedExisting = true;
        }
      }

      if (productId) {
        const { error } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', productId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from('products')
          .insert(productPayload)
          .select('id')
          .single();
        if (error || !created) throw error || new Error('Insert failed');
        productId = created.id;
      }

      // Sync product_images (do not wipe existing images if auto-matched and no new images were added)
      if (!isAutoMatchedExisting || editing.images.length > 0) {
        await supabase
          .from('product_images')
          .delete()
          .eq('product_id', productId);

        if (editing.images.length > 0) {
          const { error: imgErr } = await supabase.from('product_images').insert(
            editing.images.map((img, i) => ({
              product_id: productId,
              variant_id: null,
              cloudinary_public_id: img.cloudinary_public_id,
              image_url: img.image_url,
              alt_text: img.alt_text || editing.name,
              display_order: i + 1,
              focal_x: img.focal_x ?? 50,
              focal_y: img.focal_y ?? 50,
            }))
          );
          if (imgErr) throw imgErr;
        }
      }

      // Sync product_variants
      if (!isAutoMatchedExisting || editing.variants.length > 0) {
        await supabase
          .from('product_variants')
          .delete()
          .eq('product_id', productId);

        if (editing.variants.length > 0) {
          const { error: varErr } = await supabase
            .from('product_variants')
            .insert(
              editing.variants.map((v) => ({
                product_id: productId,
                sku: v.sku || `${editing.sku}-${v.size}-${v.colour_name}`,
                size: v.size,
                colour_name: v.colour_name,
                colour_hex: v.colour_hex || '#080808',
                selling_price_override: v.selling_price_override,
                stock_quantity: Number(v.stock_quantity) || 0,
                is_active: v.is_active ?? true,
              }))
            );
          if (varErr) throw varErr;
        }
      }

      await revalidateStorefront();
      await fetchData();
      setEditing(null);
      setStatusMsg('Product saved & synced to storefront.');
    } catch (err: unknown) {
      const supaErr = err as { message?: string; details?: string };
      setStatusMsg(
        supaErr?.message ||
          (err instanceof Error ? err.message : 'Save failed')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (!confirm(`Delete product "${prod.name}" permanently?`)) return;
    const supabase = createClient();
    for (const img of prod.product_images || []) {
      if (img.cloudinary_public_id) {
        await fetch('/api/admin/cloudinary', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_id: img.cloudinary_public_id }),
        }).catch(() => {});
      }
    }
    await supabase.from('products').delete().eq('id', prod.id);
    await revalidateStorefront();
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#0066FF]">
            INVENTORY & CATALOGUE
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">
            Product Management
          </h1>
        </div>
        <button
          type="button"
          onClick={() => openEditorForProduct()}
          className="inline-flex items-center gap-2 bg-[#080808] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#0066FF] transition"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {statusMsg && (
        <div className="border border-[#0066FF]/30 bg-[#0066FF]/10 px-4 py-3 text-xs font-bold">
          {statusMsg}
        </div>
      )}

      {/* Product Editor Form */}
      {editing && (
        <form
          onSubmit={handleSaveProduct}
          className="border border-[#E5E5E5] bg-white p-6 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
            <h2 className="text-sm font-black uppercase tracking-wider">
              {editing.id
                ? `Edit Product: ${editing.name}`
                : 'Create New Product'}
            </h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-neutral-400 hover:text-[#080808]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* SMART COPY-PASTE AUTO-FILL PANEL */}
          <div className="border-2 border-dashed border-[#0066FF]/40 bg-[#F4F4F4]/70 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#0066FF]" />
                <span className="text-xs font-black uppercase tracking-wider text-[#080808]">
                  Smart Copy-Paste Auto-Fill (100% Field Mapping)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyTemplate('blank')}
                  className="inline-flex items-center gap-1.5 border border-[#E5E5E5] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#080808] hover:border-[#080808]"
                >
                  <Copy className="h-3 w-3" />
                  <span>
                    {copiedFormatType === 'blank'
                      ? 'Copied Blank Format!'
                      : 'Copy Blank Format'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyTemplate('sample')}
                  className="inline-flex items-center gap-1.5 border border-[#E5E5E5] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#080808] hover:border-[#080808]"
                >
                  <Copy className="h-3 w-3" />
                  <span>
                    {copiedFormatType === 'sample'
                      ? 'Copied Sample Format!'
                      : 'Copy Sample Format'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPasteBoxText(PRODUCT_COPY_PASTE_TEMPLATE);
                    parseAndAutoFillProduct(PRODUCT_COPY_PASTE_TEMPLATE);
                  }}
                  className="inline-flex items-center gap-1.5 bg-[#0066FF] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#080808]"
                >
                  <ClipboardPaste className="h-3 w-3" />
                  <span>Load & Auto-Fill Sample</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-neutral-600">
              Paste your formatted product text below — all boxes (Name, Slug, SKU, Category, Prices, Stock, Sizes, Colours, Status checkboxes, full Product Description, and SEO) auto-fill immediately!
            </p>

            <textarea
              rows={5}
              value={pasteBoxText}
              onChange={(e) => {
                const val = e.target.value;
                setPasteBoxText(val);
                if (val.trim().length > 10) {
                  parseAndAutoFillProduct(val);
                }
              }}
              placeholder={`Paste product specification here (e.g.:\nPRODUCT NAME:\nADYORA Beige Linen Blend Shirt\n\nSKU:\nADY-SHIRT-002\n...)`}
              className="w-full border border-[#E5E5E5] bg-white p-3 font-mono text-xs focus:border-[#0066FF] focus:outline-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              {pasteFeedback ? (
                <span className="text-[11px] font-bold text-emerald-700">
                  ✓ {pasteFeedback}
                </span>
              ) : (
                <span className="text-[11px] text-neutral-400">
                  Supports both `PRODUCT NAME:\nValue` and `**Product Name:** Value` formats.
                </span>
              )}
              <button
                type="button"
                onClick={() => parseAndAutoFillProduct(pasteBoxText)}
                className="inline-flex items-center gap-1.5 bg-[#080808] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white hover:bg-[#0066FF]"
              >
                <Sparkles className="h-3 w-3" />
                <span>Auto-Fill Fields from Text</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={editing.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const slug = !editing.id
                    ? name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '')
                    : editing.slug;
                  setEditing({ ...editing, name, slug });
                }}
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Product Slug *
              </label>
              <input
                type="text"
                required
                value={editing.slug}
                onChange={(e) =>
                  setEditing({ ...editing, slug: e.target.value })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                SKU *
              </label>
              <input
                type="text"
                required
                value={editing.sku}
                onChange={(e) => setEditing({ ...editing, sku: e.target.value })}
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Category
              </label>
              <select
                value={editing.category_id}
                onChange={(e) =>
                  setEditing({ ...editing, category_id: e.target.value })
                }
                className="mt-1 w-full border border-[#E5E5E5] bg-white px-3 py-2 text-xs"
              >
                <option value="">-- Select Category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={editing.selling_price}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    selling_price: Number(e.target.value),
                  })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Original Price (₹, optional for discount)
              </label>
              <input
                type="number"
                step="0.01"
                value={editing.original_price}
                onChange={(e) =>
                  setEditing({ ...editing, original_price: e.target.value })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Cost Price (₹ — Admin Only)
              </label>
              <input
                type="number"
                step="0.01"
                value={editing.cost_price}
                onChange={(e) =>
                  setEditing({ ...editing, cost_price: Number(e.target.value) })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Total Stock Quantity *
              </label>
              <input
                type="number"
                required
                value={editing.stock_quantity}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    stock_quantity: Number(e.target.value),
                  })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Available Sizes (comma separated)
              </label>
              <input
                type="text"
                value={editing.sizesText}
                onChange={(e) =>
                  setEditing({ ...editing, sizesText: e.target.value })
                }
                placeholder="XS, S, M, L, XL, XXL"
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* Colours Manager */}
          <div className="border-t border-[#E5E5E5] pt-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Colour Options
              </label>
              <button
                type="button"
                onClick={() =>
                  setEditing({
                    ...editing,
                    colours: [
                      ...editing.colours,
                      { name: 'Electric Blue', hex: '#0066FF' },
                    ],
                  })
                }
                className="text-xs font-bold text-[#0066FF]"
              >
                + Add Colour
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              {editing.colours.map((col, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 border border-[#E5E5E5] p-2"
                >
                  <input
                    type="color"
                    value={col.hex}
                    onChange={(e) => {
                      const next = [...editing.colours];
                      next[idx] = { ...col, hex: e.target.value };
                      setEditing({ ...editing, colours: next });
                    }}
                    className="h-6 w-6 cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={col.name}
                    onChange={(e) => {
                      const next = [...editing.colours];
                      next[idx] = { ...col, name: e.target.value };
                      setEditing({ ...editing, colours: next });
                    }}
                    className="w-28 border border-[#E5E5E5] px-2 py-1 text-xs"
                  />
                  <input
                    type="text"
                    value={col.hex}
                    onChange={(e) => {
                      const next = [...editing.colours];
                      next[idx] = { ...col, hex: e.target.value };
                      setEditing({ ...editing, colours: next });
                    }}
                    className="w-20 border border-[#E5E5E5] px-2 py-1 font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        colours: editing.colours.filter((_, i) => i !== idx),
                      })
                    }
                    className="text-neutral-400 hover:text-red-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Visibility & Collection Flags */}
          <div className="flex flex-wrap gap-6 border-t border-[#E5E5E5] pt-4 text-xs font-bold uppercase tracking-wider">
            {[
              { key: 'is_published' as const, label: 'Published (Live)' },
              { key: 'is_new_arrival' as const, label: 'New Arrival' },
              { key: 'is_featured' as const, label: 'Featured' },
              { key: 'is_best_seller' as const, label: 'Best Seller' },
              { key: 'is_sale' as const, label: 'On Sale' },
            ].map((flag) => (
              <label key={flag.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing[flag.key]}
                  onChange={(e) =>
                    setEditing({ ...editing, [flag.key]: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#080808]"
                />
                <span>{flag.label}</span>
              </label>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
              Product Description
            </label>
            <textarea
              rows={8}
              value={editing.description}
              onChange={(e) =>
                setEditing({ ...editing, description: e.target.value })
              }
              className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs leading-relaxed"
            />
          </div>

          {/* Multi-Image Cloudinary Upload & Reordering */}
          <div className="border-t border-[#E5E5E5] pt-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                Product Images (Cloudinary Multi-Upload & Reorder)
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 bg-[#080808] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0066FF]">
                {uploadingImg ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                <span>{uploadingImg ? 'Uploading...' : 'Upload Images'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingImg}
                  onChange={handleUploadProductImages}
                  className="hidden"
                />
              </label>
            </div>

            {editing.images.length === 0 ? (
              <p className="mt-3 text-xs text-neutral-400">
                No product images uploaded yet.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
                {editing.images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="border border-[#E5E5E5] bg-[#F4F4F4] p-2 space-y-2"
                  >
                    <div className="aspect-[4/5] w-full overflow-hidden bg-[#F4F4F4]">
                      <img
                        src={getOptimizedCloudinaryUrl(img.image_url, {
                          width: 400,
                          crop: 'pad',
                        })}
                        alt={img.alt_text}
                        className="h-full w-full object-contain object-center"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase">
                        #{idx + 1} {idx === 0 ? '(Main)' : ''}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, -1)}
                          className="p-1 hover:bg-neutral-200"
                          title="Move Left"
                        >
                          <ArrowUp className="h-3 w-3 -rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 1)}
                          className="p-1 hover:bg-neutral-200"
                          title="Move Right"
                        >
                          <ArrowDown className="h-3 w-3 -rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(idx)}
                          className="p-1 text-red-600 hover:bg-red-50"
                          title="Delete Image"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* PRODUCT DETAIL PAGE (PDP) DISPLAY & OFFER CONTROLS             */}
          {/* Active / Disable toggles + editable values for each widget     */}
          {/* ============================================================== */}
          <div className="border-t border-[#E5E5E5] pt-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#080808]">
                  Product Detail Page (PDP) Display & Offer Controls
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Enable or disable Size Chart, Promo Offers (10% OFF), Online vs. COD Price comparison, Trust Badges, and Accordions for this product.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* 1. Size Chart / Size Guide Control */}
              <div className="border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#080808]">
                      Size Chart / Size Guide
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Show &ldquo;Size Guide&rdquo; button & measurement chart modal on product page
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        pdpConfig: {
                          ...editing.pdpConfig,
                          showSizeGuide: !editing.pdpConfig.showSizeGuide,
                        },
                      })
                    }
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                      editing.pdpConfig.showSizeGuide
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {editing.pdpConfig.showSizeGuide ? 'Active' : 'Disabled'}
                  </button>
                </div>
              </div>

              {/* 2. "NEW" Image Badge + Pincode Checker Controls */}
              <div className="border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#080808]">
                      &ldquo;NEW&rdquo; Image Pill Badge
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Show green &ldquo;NEW&rdquo; badge on main product image
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        pdpConfig: {
                          ...editing.pdpConfig,
                          showNewBadge: !editing.pdpConfig.showNewBadge,
                        },
                      })
                    }
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                      editing.pdpConfig.showNewBadge
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {editing.pdpConfig.showNewBadge ? 'Active' : 'Disabled'}
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-[#E5E5E5] pt-2.5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#080808]">
                      Delivery Pincode Checker
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Show &ldquo;Check for Delivery Details&rdquo; pincode box
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        pdpConfig: {
                          ...editing.pdpConfig,
                          showPincodeChecker:
                            !editing.pdpConfig.showPincodeChecker,
                        },
                      })
                    }
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                      editing.pdpConfig.showPincodeChecker
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {editing.pdpConfig.showPincodeChecker
                      ? 'Active'
                      : 'Disabled'}
                  </button>
                </div>
              </div>

              {/* 3. Promo Offer Banner (BUY MORE. SAVE MORE. / 10% OFF) */}
              <div className="border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#080808]">
                      Promo Offer Box (e.g. 10% OFF Banner)
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Show &ldquo;BUY MORE. SAVE MORE.&rdquo; discount banner card
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        pdpConfig: {
                          ...editing.pdpConfig,
                          showPromoBanner: !editing.pdpConfig.showPromoBanner,
                        },
                      })
                    }
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                      editing.pdpConfig.showPromoBanner
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {editing.pdpConfig.showPromoBanner ? 'Active' : 'Disabled'}
                  </button>
                </div>

                {editing.pdpConfig.showPromoBanner && (
                  <div className="space-y-2 border-t border-[#E5E5E5] pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-neutral-500">
                          Promo Heading
                        </label>
                        <input
                          type="text"
                          value={editing.pdpConfig.promoTitle}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              pdpConfig: {
                                ...editing.pdpConfig,
                                promoTitle: e.target.value,
                              },
                            })
                          }
                          className="mt-1 w-full border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-neutral-500">
                          Badge Text (e.g. 10% OFF)
                        </label>
                        <input
                          type="text"
                          value={editing.pdpConfig.promoBadge}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              pdpConfig: {
                                ...editing.pdpConfig,
                                promoBadge: e.target.value,
                              },
                            })
                          }
                          className="mt-1 w-full border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-neutral-500">
                        Promo Description
                      </label>
                      <input
                        type="text"
                        value={editing.pdpConfig.promoText}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            pdpConfig: {
                              ...editing.pdpConfig,
                              promoText: e.target.value,
                            },
                          })
                        }
                        className="mt-1 w-full border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Payment Comparison & COD Price Box */}
              <div className="border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#080808]">
                      Online vs. COD Price Box (&ldquo;Choose how you pay&rdquo;)
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Show Online UPI/Card savings vs. Cash on Delivery fee box
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        pdpConfig: {
                          ...editing.pdpConfig,
                          showPaymentComparison:
                            !editing.pdpConfig.showPaymentComparison,
                        },
                      })
                    }
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                      editing.pdpConfig.showPaymentComparison
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {editing.pdpConfig.showPaymentComparison
                      ? 'Active'
                      : 'Disabled'}
                  </button>
                </div>

                {editing.pdpConfig.showPaymentComparison && (
                  <div className="grid grid-cols-3 gap-2 border-t border-[#E5E5E5] pt-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-neutral-500">
                        Online Save (₹)
                      </label>
                      <input
                        type="number"
                        value={editing.pdpConfig.onlineSavingsAmount}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            pdpConfig: {
                              ...editing.pdpConfig,
                              onlineSavingsAmount: Number(e.target.value),
                            },
                          })
                        }
                        className="mt-1 w-full border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-neutral-500">
                        COD Fee Min (₹)
                      </label>
                      <input
                        type="number"
                        value={editing.pdpConfig.codFeeMin}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            pdpConfig: {
                              ...editing.pdpConfig,
                              codFeeMin: Number(e.target.value),
                            },
                          })
                        }
                        className="mt-1 w-full border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-neutral-500">
                        COD Fee Max (₹)
                      </label>
                      <input
                        type="number"
                        value={editing.pdpConfig.codFeeMax}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            pdpConfig: {
                              ...editing.pdpConfig,
                              codFeeMax: Number(e.target.value),
                            },
                          })
                        }
                        className="mt-1 w-full border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Trust Badges Strip (COD, Free Shipping, Easy Returns) */}
              <div className="border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#080808]">
                      Trust Badges Strip (COD • Free Shipping • Easy Returns)
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Toggle the 3-icon guarantee strip or customize which badges appear
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        pdpConfig: {
                          ...editing.pdpConfig,
                          showTrustBadges: !editing.pdpConfig.showTrustBadges,
                        },
                      })
                    }
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                      editing.pdpConfig.showTrustBadges
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {editing.pdpConfig.showTrustBadges ? 'Active' : 'Disabled'}
                  </button>
                </div>

                {editing.pdpConfig.showTrustBadges && (
                  <div className="flex flex-wrap gap-6 border-t border-[#E5E5E5] pt-3 text-xs font-bold uppercase">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editing.pdpConfig.showCodBadge}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            pdpConfig: {
                              ...editing.pdpConfig,
                              showCodBadge: e.target.checked,
                            },
                          })
                        }
                        className="h-4 w-4 accent-[#080808]"
                      />
                      <span>Cash on Delivery</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editing.pdpConfig.showFreeShippingBadge}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            pdpConfig: {
                              ...editing.pdpConfig,
                              showFreeShippingBadge: e.target.checked,
                            },
                          })
                        }
                        className="h-4 w-4 accent-[#080808]"
                      />
                      <span>Free Shipping</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editing.pdpConfig.showEasyReturnsBadge}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            pdpConfig: {
                              ...editing.pdpConfig,
                              showEasyReturnsBadge: e.target.checked,
                            },
                          })
                        }
                        className="h-4 w-4 accent-[#080808]"
                      />
                      <span>Easy Returns</span>
                    </label>
                  </div>
                )}
              </div>

              {/* 6. Fabric & Silhouette Accordion */}
              <div className="border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#080808]">
                    Fabric & Silhouette Accordion
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        pdpConfig: {
                          ...editing.pdpConfig,
                          showFabricAccordion:
                            !editing.pdpConfig.showFabricAccordion,
                        },
                      })
                    }
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                      editing.pdpConfig.showFabricAccordion
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {editing.pdpConfig.showFabricAccordion
                      ? 'Active'
                      : 'Disabled'}
                  </button>
                </div>
                {editing.pdpConfig.showFabricAccordion && (
                  <textarea
                    rows={3}
                    value={editing.pdpConfig.fabricSpecsText}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        pdpConfig: {
                          ...editing.pdpConfig,
                          fabricSpecsText: e.target.value,
                        },
                      })
                    }
                    className="w-full border border-[#E5E5E5] bg-white p-2 text-xs"
                  />
                )}
              </div>

              {/* 7. Shipping & Returns Accordion */}
              <div className="border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#080808]">
                    Shipping & Returns Accordion
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        pdpConfig: {
                          ...editing.pdpConfig,
                          showShippingAccordion:
                            !editing.pdpConfig.showShippingAccordion,
                        },
                      })
                    }
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                      editing.pdpConfig.showShippingAccordion
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {editing.pdpConfig.showShippingAccordion
                      ? 'Active'
                      : 'Disabled'}
                  </button>
                </div>
                {editing.pdpConfig.showShippingAccordion && (
                  <textarea
                    rows={3}
                    value={editing.pdpConfig.shippingSpecsText}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        pdpConfig: {
                          ...editing.pdpConfig,
                          shippingSpecsText: e.target.value,
                        },
                      })
                    }
                    className="w-full border border-[#E5E5E5] bg-white p-2 text-xs"
                  />
                )}
              </div>
            </div>
          </div>

          {/* SEO Fields */}
          <div className="grid grid-cols-1 gap-4 border-t border-[#E5E5E5] pt-4 md:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                SEO Title
              </label>
              <input
                type="text"
                value={editing.seo_title}
                onChange={(e) =>
                  setEditing({ ...editing, seo_title: e.target.value })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                SEO Description
              </label>
              <input
                type="text"
                value={editing.seo_description}
                onChange={(e) =>
                  setEditing({ ...editing, seo_description: e.target.value })
                }
                className="mt-1 w-full border border-[#E5E5E5] px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-[#E5E5E5] pt-4">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="border border-[#E5E5E5] px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#080808] px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#0066FF]"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving...' : 'Save Product'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Products Table */}
      <div className="border border-[#E5E5E5] bg-white">
        {loading ? (
          <p className="p-8 text-center text-xs text-neutral-500">
            Loading products...
          </p>
        ) : products.length === 0 ? (
          <p className="p-8 text-center text-xs text-neutral-500">
            No products in catalogue yet. Click &ldquo;Add Product&rdquo; above
            to create your first product.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#F4F4F4] text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">Product / SKU</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {products.map((prod) => {
                  const thumb = prod.product_images?.[0]?.image_url;
                  return (
                    <tr key={prod.id} className="hover:bg-[#F4F4F4]/30">
                      <td className="px-4 py-3">
                        <div className="h-14 w-12 overflow-hidden bg-[#F4F4F4] border border-[#E5E5E5]">
                          {thumb ? (
                            <img
                              src={getOptimizedCloudinaryUrl(thumb, {
                                width: 400,
                              })}
                              alt={prod.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[9px] text-neutral-400">
                              None
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold uppercase text-[#080808]">
                          {prod.name}
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          SKU: {prod.sku}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {prod.category?.name || 'Uncategorized'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-extrabold">
                          ₹{Number(prod.selling_price).toLocaleString('en-IN')}
                        </span>
                        {prod.original_price && (
                          <span className="ml-1.5 text-[11px] text-neutral-400 line-through">
                            ₹
                            {Number(prod.original_price).toLocaleString(
                              'en-IN'
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-bold ${
                            prod.stock_quantity <= 5
                              ? 'text-red-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {prod.stock_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                            prod.is_published
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-neutral-200 text-neutral-600'
                          }`}
                        >
                          {prod.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditorForProduct(prod)}
                          className="inline-flex items-center gap-1 border border-[#E5E5E5] px-2.5 py-1 text-[11px] font-bold hover:border-[#080808]"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod)}
                          className="inline-flex items-center gap-1 border border-red-200 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
