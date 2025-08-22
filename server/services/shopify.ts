export interface ShopifyVariant {
  id: string;
  sku: string;
  price: string;
  compare_at_price?: string;
  product_id: string;
}

export interface ShopifyProduct {
  id: string;
  variants: ShopifyVariant[];
}

export class ShopifyService {
  private shopUrl: string;
  private accessToken: string;

  constructor(shopUrl: string, accessToken: string) {
    this.shopUrl = shopUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string, method: string = 'GET', body?: any) {
    const url = `https://${this.shopUrl}/admin/api/2023-10/${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API error: ${response.status} ${errorText}`);
    }

    return await response.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('shop.json');
      return true;
    } catch (error) {
      console.error('Shopify connection test failed:', error);
      return false;
    }
  }

  async findVariantBySku(sku: string): Promise<ShopifyVariant | null> {
    try {
      // Search for products with the SKU
      const response = await this.makeRequest(`products.json?limit=250`);
      
      for (const product of response.products) {
        const variant = product.variants.find((v: any) => v.sku === sku);
        if (variant) {
          return {
            id: variant.id.toString(),
            sku: variant.sku,
            price: variant.price,
            compare_at_price: variant.compare_at_price,
            product_id: product.id.toString(),
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error finding variant with SKU ${sku}:`, error);
      throw error;
    }
  }

  async updateVariantPrice(variantId: string, price: number, compareAtPrice?: number): Promise<ShopifyVariant> {
    try {
      const updateData: any = {
        variant: {
          id: variantId,
          price: price.toFixed(2),
        }
      };

      if (compareAtPrice !== undefined) {
        updateData.variant.compare_at_price = compareAtPrice.toFixed(2);
      }

      const response = await this.makeRequest(`variants/${variantId}.json`, 'PUT', updateData);
      
      return {
        id: response.variant.id.toString(),
        sku: response.variant.sku,
        price: response.variant.price,
        compare_at_price: response.variant.compare_at_price,
        product_id: response.variant.product_id.toString(),
      };
    } catch (error) {
      console.error(`Error updating variant ${variantId}:`, error);
      throw error;
    }
  }

  async getVariant(variantId: string): Promise<ShopifyVariant> {
    try {
      const response = await this.makeRequest(`variants/${variantId}.json`);
      
      return {
        id: response.variant.id.toString(),
        sku: response.variant.sku,
        price: response.variant.price,
        compare_at_price: response.variant.compare_at_price,
        product_id: response.variant.product_id.toString(),
      };
    } catch (error) {
      console.error(`Error getting variant ${variantId}:`, error);
      throw error;
    }
  }
}
