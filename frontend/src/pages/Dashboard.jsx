import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Dashboard.css";

const API = "http://localhost:5000/api";

function Dashboard() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "User";
  const role = localStorage.getItem("role") || "guest";
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (role === "normal") {
      navigate("/sales");
    }
  }, [role, navigate]);

  const [section, setSection] = useState("overview");
  const [stats, setStats] = useState({ totalProducts: 0, totalSales: 0 });

  // Products state
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    product_name: "",
    category: "",
    price: "",
    quantity: "",
    barcode: "",
    currency: "USD",
    image_url: "",
  });
  const [productError, setProductError] = useState("");

  // Sales state
  const [sales, setSales] = useState([]);

  // Customers state
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerModal, setCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", email: "", address: "", loyalty_points: 0 });
  const [customerError, setCustomerError] = useState("");

  const isAdmin = role.toLowerCase() === "admin";
  const isGuest = role === "guest";

  const existingCategories = [...new Set(products.map((p) => p.category))].filter(Boolean).sort();

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (section === "products") loadProducts();
    if (section === "sales") loadSales();
    if (section === "customers") loadCustomers();
  }, [section]);

  // ---- Overview ----
  async function loadOverview() {
    try {
      const [pRes, sRes] = await Promise.all([
        axios.get(`${API}/products`, { headers }),
        axios.get(`${API}/sales`, { headers }),
      ]);
      setStats({
        totalProducts: pRes.data.length,
        totalSales: sRes.data.length,
      });
    } catch (err) {
      console.error("Overview failed", err);
    }
  }

  // ---- Products ----
  async function loadProducts() {
    try {
      const res = await axios.get(`${API}/products`, { headers });
      setProducts(res.data);
    } catch (err) {
      console.error("Products failed", err);
    }
  }

  function openProductModal(product = null) {
    setEditingProduct(product);
    setProductForm(
      product
        ? {
            product_name: product.product_name,
            category: product.category,
            price: product.price,
            quantity: product.quantity,
            barcode: product.barcode || "",
            currency: product.currency || "USD",
            image_url: product.image_url || "",
          }
        : {
            product_name: "",
            category: "",
            price: "",
            quantity: "",
            barcode: "",
            currency: "USD",
            image_url: "",
          },
    );
    setProductError("");
    setProductModal(true);
  }

  async function saveProduct() {
    const { product_name, category, price } = productForm;
    if (!product_name || !category || !price) {
      setProductError("Name, category, and price are required.");
      return;
    }
    try {
      if (editingProduct) {
        await axios.put(
          `${API}/products/${editingProduct.product_id}`,
          productForm,
          { headers },
        );
      } else {
        await axios.post(`${API}/products`, productForm, { headers });
      }
      setProductModal(false);
      loadProducts();
      loadOverview();
    } catch (err) {
      setProductError("Failed to save product.");
    }
  }

  async function deleteProduct(id) {
    if (!window.confirm("Delete this product?")) return;
    try {
      await axios.delete(`${API}/products/${id}`, { headers });
      loadProducts();
      loadOverview();
    } catch (err) {
      alert("Failed to delete product.");
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase()),
  );

  // ---- Sales ----
  async function loadSales() {
    try {
      const res = await axios.get(`${API}/sales`, { headers });
      setSales(res.data);
    } catch (err) {
      console.error("Sales failed", err);
    }
  }

  // ---- Customers ----
  async function loadCustomers() {
    try {
      const res = await axios.get(`${API}/customers`, { headers });
      setCustomers(res.data);
    } catch (err) {
      console.error("Customers failed", err);
    }
  }

  function openCustomerModal(customer = null) {
    setEditingCustomer(customer);
    if (customer) {
      setCustomerForm({ ...customer });
    } else {
      setCustomerForm({ name: "", phone: "", email: "", address: "", loyalty_points: 0 });
    }
    setCustomerError("");
    setCustomerModal(true);
  }

  async function saveCustomer() {
    const { name } = customerForm;
    if (!name) {
      setCustomerError("Name is required.");
      return;
    }
    try {
      if (editingCustomer) {
        await axios.put(`${API}/customers/${editingCustomer.customer_id}`, customerForm, { headers });
      } else {
        await axios.post(`${API}/customers`, customerForm, { headers });
      }
      setCustomerModal(false);
      loadCustomers();
    } catch (err) {
      setCustomerError("Failed to save customer.");
    }
  }

  async function deleteCustomer(id) {
    if (!window.confirm("Delete this customer?")) return;
    try {
      await axios.delete(`${API}/customers/${id}`, { headers });
      loadCustomers();
    } catch (err) {
      alert("Failed to delete customer.");
    }
  }

  const filteredCustomers = customers.filter(
    (c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
           (c.phone && c.phone.includes(customerSearch))
  );

  // ---- Logout ----
  function handleLogout() {
    localStorage.clear();
    navigate("/");
  }

  return (
    <div className="dash-wrapper">
      {/* Navbar */}
      <nav className="dash-navbar">
        <div className="dash-brand">🛒 POS System</div>
        <div className="dash-nav-right">
          <span className="dash-username">👤 {username}</span>
          <span className="dash-role-badge">{role}</span>
          <button className="dash-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dash-layout">
        {/* Sidebar */}
        <aside className="dash-sidebar">
          <ul className="dash-sidebar-menu">
            <li>
              <a
                href="#"
                className={section === "overview" ? "active" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  setSection("overview");
                  loadOverview();
                }}
              >
                📊 Overview
              </a>
            </li>
            {!isGuest && (
              <>
                <li>
                  <a
                    href="#"
                    className={section === "products" ? "active" : ""}
                    onClick={(e) => {
                      e.preventDefault();
                      setSection("products");
                    }}
                  >
                    📦 Products
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className={section === "customers" ? "active" : ""}
                    onClick={(e) => {
                      e.preventDefault();
                      setSection("customers");
                    }}
                  >
                    👥 Customers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/sales");
                    }}
                  >
                    🧾 Register
                  </a>
                </li>

              </>
            )}
          </ul>
        </aside>

        {/* Main content */}
        <main className="dash-main">
          {/* Overview */}
          {section === "overview" && (
            <div>
              <h2 className="dash-section-title">Welcome back, {username}!</h2>
              {isGuest ? (
                <div className="dash-guest-notice">
                  👀 You are browsing as a guest. Login with an account to
                  access full features.
                </div>
              ) : (
                <div className="dash-stats-grid">
                  <div className="dash-stat-card">
                    <div className="dash-stat-icon">📦</div>
                    <div className="dash-stat-info">
                      <span className="dash-stat-label">Total Products</span>
                      <span className="dash-stat-value">
                        {stats.totalProducts}
                      </span>
                    </div>
                  </div>
                  <div className="dash-stat-card">
                    <div className="dash-stat-icon">🧾</div>
                    <div className="dash-stat-info">
                      <span className="dash-stat-label">Total Sales</span>
                      <span className="dash-stat-value">
                        {stats.totalSales}
                      </span>
                    </div>
                  </div>
                  <div className="dash-stat-card">
                    <div className="dash-stat-icon">🔐</div>
                    <div className="dash-stat-info">
                      <span className="dash-stat-label">Role</span>
                      <span
                        className="dash-stat-value"
                        style={{
                          textTransform: "capitalize",
                          fontSize: "20px",
                        }}
                      >
                        {role}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!isGuest && (
                <div className="dash-quick-actions">
                  <h3 className="dash-subsection-title">Quick Actions</h3>
                  <div className="dash-actions-grid">
                    <div
                      className="dash-action-card"
                      onClick={() => setSection("products")}
                    >
                      <span className="dash-action-icon">📦</span>
                      <span>Manage Products</span>
                    </div>
                    <div
                      className="dash-action-card"
                      onClick={() => navigate("/sales")}
                    >
                      <span className="dash-action-icon">🧾</span>
                      <span>Make a Sale</span>
                    </div>
                    <div
                      className="dash-action-card"
                      onClick={() => navigate("/sales?tab=history")}
                    >
                      <span className="dash-action-icon">📋</span>
                      <span>Sales History</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Products */}
          {section === "products" && (
            <div>
              <div className="dash-section-header">
                <h2 className="dash-section-title" style={{ margin: 0 }}>
                  Products
                </h2>
                {isAdmin && (
                  <button
                    className="dash-btn dash-btn-primary"
                    onClick={() => openProductModal()}
                  >
                    + Add Product
                  </button>
                )}
              </div>
              <div className="dash-search-bar">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
              <div className="dash-table-container">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Img</th>
                      <th>#</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Barcode</th>
                      <th>Stock</th>
                      {isAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isAdmin ? 8 : 7}
                          className="dash-table-empty"
                        >
                          No products found.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p, idx) => (
                        <tr key={p.product_id}>
                          <td className="dash-product-img-cell">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.product_name} />
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                          <td>{idx + 1}</td>
                          <td>{p.product_name}</td>
                          <td>{p.category}</td>
                          <td>{p.currency === 'EUR' ? '€' : p.currency === 'GBP' ? '£' : p.currency === 'GHS' ? '₵' : '$'}{parseFloat(p.price).toFixed(2)}</td>
                          <td>{p.barcode || "-"}</td>
                          <td>
                            <span
                              className={`dash-badge ${p.quantity <= 10 ? "dash-badge-warning" : "dash-badge-success"}`}
                            >
                              {p.quantity}
                            </span>
                          </td>
                          {isAdmin && (
                            <td>
                              <button
                                className="dash-btn dash-btn-sm dash-btn-outline"
                                onClick={() => openProductModal(p)}
                              >
                                Edit
                              </button>{" "}
                              <button
                                className="dash-btn dash-btn-sm dash-btn-danger"
                                onClick={() => deleteProduct(p.product_id)}
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sales History */}
          {section === "sales" && (
            <div>
              <div className="dash-section-header">
                <h2 className="dash-section-title" style={{ margin: 0 }}>
                  Sales History
                </h2>
              </div>
              <div className="dash-table-container">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Sale ID</th>
                      <th>Date</th>
                      <th>Cashier</th>
                      <th>Total</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="dash-table-empty">
                          No sales yet.
                        </td>
                      </tr>
                    ) : (
                      sales.map((s) => (
                        <tr key={s.sale_id}>
                          <td>#{s.sale_id}</td>
                          <td>{new Date(s.date).toLocaleString()}</td>
                          <td>{s.username}</td>
                          <td>${parseFloat(s.total_amount).toFixed(2)}</td>
                          <td>
                            <span className="dash-badge dash-badge-info">
                              {s.payment_method}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Customers */}
          {section === "customers" && (
            <div>
              <div className="dash-section-header">
                <h2 className="dash-section-title" style={{ margin: 0 }}>
                  Customers
                </h2>
                {isAdmin && (
                  <button
                    className="dash-btn dash-btn-primary"
                    onClick={() => openCustomerModal()}
                  >
                    + Add Customer
                  </button>
                )}
              </div>
              <div className="dash-search-bar">
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>
              <div className="dash-table-container">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Loyalty Points</th>
                      {isAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 6 : 5} className="dash-table-empty">
                          No customers found.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c, idx) => (
                        <tr key={c.customer_id}>
                          <td>{idx + 1}</td>
                          <td>{c.name}</td>
                          <td>{c.phone || "-"}</td>
                          <td>{c.email || "-"}</td>
                          <td>
                            <span className="dash-badge dash-badge-info">
                              {c.loyalty_points} pts
                            </span>
                          </td>
                          {isAdmin && (
                            <td>
                              <button
                                className="dash-btn dash-btn-sm dash-btn-outline"
                                onClick={() => openCustomerModal(c)}
                              >
                                Edit
                              </button>{" "}
                              <button
                                className="dash-btn dash-btn-sm dash-btn-danger"
                                onClick={() => deleteCustomer(c.customer_id)}
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Product Modal */}
      {productModal && (
        <div
          className="dash-modal-overlay"
          onClick={() => setProductModal(false)}
        >
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>{editingProduct ? "Edit Product" : "Add Product"}</h3>
              <button
                className="dash-modal-close"
                onClick={() => setProductModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="dash-modal-body">
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={productForm.product_name}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        product_name: e.target.value,
                      })
                    }
                    placeholder="Product name"
                  />
                </div>
                <div className="dash-form-group">
                  <label>Category *</label>
                  <input
                    type="text"
                    list="category-suggestions"
                    value={productForm.category}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        category: e.target.value,
                      })
                    }
                    placeholder="e.g. Beverages"
                  />
                  <datalist id="category-suggestions">
                    {existingCategories.map((cat, idx) => (
                      <option key={idx} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label>Price *</label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm({ ...productForm, price: e.target.value })
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="dash-form-group">
                  <label>Stock Quantity</label>
                  <input
                    type="number"
                    value={productForm.quantity}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        quantity: e.target.value,
                      })
                    }
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label>Barcode</label>
                  <input
                    type="text"
                    value={productForm.barcode}
                    onChange={(e) =>
                      setProductForm({ ...productForm, barcode: e.target.value })
                    }
                    placeholder="Barcode number"
                  />
                </div>
                <div className="dash-form-group">
                  <label>Currency</label>
                  <select
                    value={productForm.currency}
                    onChange={(e) =>
                      setProductForm({ ...productForm, currency: e.target.value })
                    }
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="GHS">GHS (₵)</option>
                  </select>
                </div>
              </div>
              <div className="dash-form-group">
                <label>Image URL (Optional)</label>
                <input
                  type="text"
                  value={productForm.image_url}
                  onChange={(e) =>
                    setProductForm({ ...productForm, image_url: e.target.value })
                  }
                  placeholder="https://example.com/image.png"
                />
                {productForm.image_url && (
                  <img src={productForm.image_url} className="dash-img-preview" alt="Preview" />
                )}
              </div>
              {productError && <div className="dash-error">{productError}</div>}
            </div>
            <div className="dash-modal-footer">
              <button
                className="dash-btn dash-btn-outline"
                onClick={() => setProductModal(false)}
              >
                Cancel
              </button>
              <button
                className="dash-btn dash-btn-primary"
                onClick={saveProduct}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {customerModal && (
        <div
          className="dash-modal-overlay"
          onClick={() => setCustomerModal(false)}
        >
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>{editingCustomer ? "Edit Customer" : "Add Customer"}</h3>
              <button
                className="dash-modal-close"
                onClick={() => setCustomerModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="dash-modal-body">
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={customerForm.name}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, name: e.target.value })
                    }
                    placeholder="Customer Name"
                  />
                </div>
                <div className="dash-form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={customerForm.phone}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, phone: e.target.value })
                    }
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div className="dash-form-row">
                <div className="dash-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, email: e.target.value })
                    }
                    placeholder="Email address"
                  />
                </div>
                <div className="dash-form-group">
                  <label>Loyalty Points</label>
                  <input
                    type="number"
                    value={customerForm.loyalty_points}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        loyalty_points: e.target.value,
                      })
                    }
                    min="0"
                  />
                </div>
              </div>
              <div className="dash-form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, address: e.target.value })
                  }
                  placeholder="Address"
                />
              </div>
              {customerError && <div className="dash-error">{customerError}</div>}
            </div>
            <div className="dash-modal-footer">
              <button
                className="dash-btn dash-btn-outline"
                onClick={() => setCustomerModal(false)}
              >
                Cancel
              </button>
              <button
                className="dash-btn dash-btn-primary"
                onClick={saveCustomer}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
