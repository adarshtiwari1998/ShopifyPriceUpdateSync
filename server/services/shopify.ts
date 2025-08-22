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

interface QueueItem {
  endpoint: string;
  method: string;
  body?: any;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export class ShopifyService {
  private shopUrl: string;
  private accessToken: string;
  private requestQueue: QueueItem[] = [];
  private isProcessingQueue = false;
  private queueDelay = 800; // 800ms between requests (safer rate limiting)

  constructor(shopUrl: string, accessToken: string) {
    this.shopUrl = shopUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.accessToken = accessToken;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const item = this.requestQueue.shift()!;
      
      try {
        // Add delay between requests (queue system)
        await new Promise(resolve => setTimeout(resolve, this.queueDelay));
        
        const result = await this.executeRequest(item.endpoint, item.method, item.body);
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  private async executeRequest(endpoint: string, method: string = 'GET', body?: any) {
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

  private async makeRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        endpoint,
        method,
        body,
        resolve,
        reject
      });

      // Start processing queue
      this.processQueue();
    });
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

  private allProducts: any[] = [];
  private productsLoaded = false;

  private async loadAllProducts(): Promise<void> {
    if (this.productsLoaded) return;
    
    try {
      this.allProducts = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await this.makeRequest(`products.json?limit=250&page=${page}`);
        
        if (response.products && response.products.length > 0) {
          this.allProducts.push(...response.products);
          page++;
          // If we got less than 250, we're done
          hasMore = response.products.length === 250;
        } else {
          hasMore = false;
        }
      }
      
      this.productsLoaded = true;
      console.log(`Loaded ${this.allProducts.length} products from Shopify`);
    } catch (error) {
      console.error('Error loading products:', error);
      throw error;
    }
  }

  async findVariantBySku(sku: string): Promise<ShopifyVariant | null> {
    try {
      // Load all products first time only
      await this.loadAllProducts();
      
      for (const product of this.allProducts) {
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
