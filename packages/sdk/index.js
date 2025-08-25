/**
 * Easbase JavaScript SDK
 * Complete backend infrastructure in 5 minutes
 */

class EasbaseClient {
  constructor(apiKey, options = {}) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || 'https://easbase.vercel.app/api/v1';
    this.projectId = options.projectId || this.extractProjectId(apiKey);
    
    // Initialize all promised services
    this.auth = new AuthResource(this);
    this.teams = new TeamsResource(this);
    this.billing = new BillingResource(this);
    this.email = new EmailResource(this);
    this.storage = new StorageResource(this);
    this.products = new ProductsResource(this);
    this.customers = new CustomersResource(this);
    this.orders = new OrdersResource(this);
    this.inventory = new InventoryResource(this);
    
    // Quick start method
    this.initialized = false;
  }
  
  async quickStart() {
    console.log('🚀 Initializing Easbase backend...');
    try {
      const status = await this.request('GET', '/health');
      this.initialized = true;
      console.log('✅ Easbase backend ready!');
      return status;
    } catch (error) {
      console.error('❌ Failed to initialize:', error.message);
      throw error;
    }
  }
  
  extractProjectId(apiKey) {
    // API keys contain the project ID
    // Format: easbase_{userId}_{timestamp}_{projectId}
    const parts = apiKey.split('_');
    return parts[parts.length - 1];
  }
  
  async request(method, path, data = null) {
    const url = `${this.baseUrl}/${this.projectId}${path}`;
    
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    };
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Request failed with status ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      throw new Error(`Easbase API Error: ${error.message}`);
    }
  }
}

class ProductsResource {
  constructor(client) {
    this.client = client;
  }
  
  async create(data) {
    return this.client.request('POST', '/products', data);
  }
  
  async list(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.client.request('GET', `/products${query ? '?' + query : ''}`);
  }
  
  async get(id) {
    return this.client.request('GET', `/products/${id}`);
  }
  
  async update(id, data) {
    return this.client.request('PATCH', `/products/${id}`, data);
  }
  
  async delete(id) {
    return this.client.request('DELETE', `/products/${id}`);
  }
  
  async updateInventory(id, quantity, reason = 'adjustment') {
    return this.client.request('POST', `/products/${id}/inventory`, {
      quantity,
      reason
    });
  }
}

class CustomersResource {
  constructor(client) {
    this.client = client;
  }
  
  async create(data) {
    return this.client.request('POST', '/customers', data);
  }
  
  async list(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.client.request('GET', `/customers${query ? '?' + query : ''}`);
  }
  
  async get(id) {
    return this.client.request('GET', `/customers/${id}`);
  }
  
  async update(id, data) {
    return this.client.request('PATCH', `/customers/${id}`, data);
  }
  
  async delete(id) {
    return this.client.request('DELETE', `/customers/${id}`);
  }
  
  async getOrders(customerId) {
    return this.client.request('GET', `/customers/${customerId}/orders`);
  }
}

class OrdersResource {
  constructor(client) {
    this.client = client;
  }
  
  async create(data) {
    // Auto-generate order number if not provided
    if (!data.order_number) {
      data.order_number = `ORD-${Date.now()}`;
    }
    return this.client.request('POST', '/orders', data);
  }
  
  async list(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.client.request('GET', `/orders${query ? '?' + query : ''}`);
  }
  
  async get(id) {
    return this.client.request('GET', `/orders/${id}`);
  }
  
  async update(id, data) {
    return this.client.request('PATCH', `/orders/${id}`, data);
  }
  
  async cancel(id) {
    return this.client.request('PATCH', `/orders/${id}`, {
      status: 'cancelled'
    });
  }
  
  async fulfill(id, trackingInfo = {}) {
    return this.client.request('POST', `/orders/${id}/fulfill`, trackingInfo);
  }
  
  async refund(id, amount = null) {
    return this.client.request('POST', `/orders/${id}/refund`, { amount });
  }
}

class InventoryResource {
  constructor(client) {
    this.client = client;
  }
  
  async adjust(productId, quantity, reason = 'manual adjustment') {
    return this.client.request('POST', '/inventory/adjust', {
      product_id: productId,
      quantity,
      reason
    });
  }
  
  async getMovements(productId = null) {
    const path = productId ? `/inventory/movements?product_id=${productId}` : '/inventory/movements';
    return this.client.request('GET', path);
  }
  
  async getLowStock(threshold = 10) {
    return this.client.request('GET', `/inventory/low-stock?threshold=${threshold}`);
  }
}

// Authentication Resource
class AuthResource {
  constructor(client) {
    this.client = client;
  }
  
  async signUp(email, password, metadata = {}) {
    return this.client.request('POST', '/auth/signup', { email, password, metadata });
  }
  
  async signIn(email, password) {
    return this.client.request('POST', '/auth/signin', { email, password });
  }
  
  async signOut() {
    return this.client.request('POST', '/auth/signout');
  }
  
  async resetPassword(email) {
    return this.client.request('POST', '/auth/reset-password', { email });
  }
  
  async updatePassword(newPassword) {
    return this.client.request('POST', '/auth/update-password', { password: newPassword });
  }
  
  async getUser() {
    return this.client.request('GET', '/auth/user');
  }
  
  async enable2FA() {
    return this.client.request('POST', '/auth/2fa/enable');
  }
  
  async verify2FA(token) {
    return this.client.request('POST', '/auth/2fa/verify', { token });
  }
  
  async signInWithProvider(provider) {
    return this.client.request('POST', '/auth/oauth', { provider });
  }
  
  async signInWithMagicLink(email) {
    return this.client.request('POST', '/auth/magic-link', { email });
  }
}

// Teams Resource
class TeamsResource {
  constructor(client) {
    this.client = client;
  }
  
  async create(name, slug = null) {
    return this.client.request('POST', '/teams', { name, slug });
  }
  
  async get(teamId) {
    return this.client.request('GET', `/teams/${teamId}`);
  }
  
  async update(teamId, updates) {
    return this.client.request('PATCH', `/teams/${teamId}`, updates);
  }
  
  async delete(teamId) {
    return this.client.request('DELETE', `/teams/${teamId}`);
  }
  
  async listMembers(teamId) {
    return this.client.request('GET', `/teams/${teamId}/members`);
  }
  
  async inviteMember(teamId, email, role = 'member') {
    return this.client.request('POST', `/teams/${teamId}/invite`, { email, role });
  }
  
  async removeMember(teamId, userId) {
    return this.client.request('DELETE', `/teams/${teamId}/members/${userId}`);
  }
  
  async updateMemberRole(teamId, userId, role) {
    return this.client.request('PATCH', `/teams/${teamId}/members/${userId}`, { role });
  }
  
  async acceptInvitation(token) {
    return this.client.request('POST', '/teams/accept-invitation', { token });
  }
}

// Billing Resource
class BillingResource {
  constructor(client) {
    this.client = client;
  }
  
  async createCheckout(priceId, successUrl, cancelUrl) {
    return this.client.request('POST', '/billing/checkout', {
      priceId,
      successUrl: successUrl || window.location.href,
      cancelUrl: cancelUrl || window.location.href
    });
  }
  
  async getSubscription() {
    return this.client.request('GET', '/billing/subscription');
  }
  
  async updateSubscription(priceId) {
    return this.client.request('PATCH', '/billing/subscription', { priceId });
  }
  
  async cancelSubscription(immediately = false) {
    return this.client.request('DELETE', '/billing/subscription', { immediately });
  }
  
  async resumeSubscription() {
    return this.client.request('POST', '/billing/subscription/resume');
  }
  
  async getPortalUrl(returnUrl) {
    return this.client.request('POST', '/billing/portal', { 
      returnUrl: returnUrl || window.location.href 
    });
  }
  
  async getInvoices(limit = 10) {
    return this.client.request('GET', `/billing/invoices?limit=${limit}`);
  }
  
  async getUsage() {
    return this.client.request('GET', '/billing/usage');
  }
  
  async recordUsage(quantity) {
    return this.client.request('POST', '/billing/usage', { quantity });
  }
}

// Email Resource
class EmailResource {
  constructor(client) {
    this.client = client;
  }
  
  async send(to, subject, html, from = null) {
    return this.client.request('POST', '/emails/send', {
      to,
      subject,
      html,
      from
    });
  }
  
  async sendTemplate(to, template, variables = {}) {
    return this.client.request('POST', '/emails/send-template', {
      to,
      template,
      variables
    });
  }
  
  async sendBulk(recipients, subject, html) {
    return this.client.request('POST', '/emails/send-bulk', {
      recipients,
      subject,
      html
    });
  }
  
  async sendSMS(to, body) {
    return this.client.request('POST', '/sms/send', { to, body });
  }
  
  async sendOTP(phoneNumber) {
    return this.client.request('POST', '/otp/send', { phoneNumber });
  }
  
  async verifyOTP(phoneNumber, code) {
    return this.client.request('POST', '/otp/verify', { phoneNumber, code });
  }
  
  async createTemplate(name, subject, html, variables = []) {
    return this.client.request('POST', '/emails/templates', {
      name,
      subject,
      html,
      variables
    });
  }
  
  async updateTemplate(templateId, updates) {
    return this.client.request('PATCH', `/emails/templates/${templateId}`, updates);
  }
}

// Storage Resource
class StorageResource {
  constructor(client) {
    this.client = client;
  }
  
  async upload(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.keys(options).forEach(key => {
      formData.append(key, options[key]);
    });
    
    return this.client.request('POST', '/storage/upload', formData);
  }
  
  async getUploadUrl(fileName, options = {}) {
    return this.client.request('POST', '/storage/upload-url', {
      fileName,
      ...options
    });
  }
  
  async download(fileId) {
    return this.client.request('GET', `/storage/files/${fileId}`);
  }
  
  async delete(fileId) {
    return this.client.request('DELETE', `/storage/files/${fileId}`);
  }
  
  async list(options = {}) {
    const query = new URLSearchParams(options).toString();
    return this.client.request('GET', `/storage/files${query ? '?' + query : ''}`);
  }
  
  async getSignedUrl(fileId, expiresIn = 3600) {
    return this.client.request('POST', `/storage/files/${fileId}/signed-url`, {
      expiresIn
    });
  }
  
  async generateThumbnail(fileId, width = 200, height = 200) {
    return this.client.request('POST', `/storage/files/${fileId}/thumbnail`, {
      width,
      height
    });
  }
  
  async getUsage() {
    return this.client.request('GET', '/storage/usage');
  }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EasbaseClient;
} else if (typeof window !== 'undefined') {
  window.EasbaseClient = EasbaseClient;
}