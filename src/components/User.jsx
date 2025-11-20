import { useContext, useState, useEffect } from "react";
import styles from "./User.module.css";
import { Link } from "react-router";
import { SessionContext } from "../context/SessionContext";
import { CartContext } from "../context/CartContext";
import { Trash2, Edit, Save, Plus } from "lucide-react";

export function User() {
  const { session, handleSignOut, sessionLoading } = useContext(SessionContext);
  const {
    products,
    loading,
    error,
    adminTools,
    isAdmin,
    fetchProducts,
  } = useContext(CartContext);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newForm, setNewForm] = useState({
    title: "",
    description: "",
    price: "",
    thumbnail: "",
  });
  const [isAdding, setIsAdding] = useState(false);

  const [notes, setNotes] = useState("");
  useEffect(() => {
    console.log(isAdmin+"chaves")
    if (isAdmin && products.length === 0) {
      fetchProducts();
    }
  }, [isAdmin, products.length, fetchProducts]);

  // --- Funções CRUD Admin ---

  function startEdit(product) {
    setEditingId(product.id);
    setEditForm({
      title: product.title,
      description: product.description,
      price: product.price,
      thumbnail: product.thumbnail,
    });
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  async function saveEdit(productId) {
    if (!isAdmin || sessionLoading) return;
    const success = await adminTools.updateProduct(productId, {
      title: editForm.title,
      description: editForm.description,
      price: parseFloat(editForm.price),
      thumbnail: editForm.thumbnail,
    });
    if (success) {
      setEditingId(null);
      setEditForm({});
      // ATUALIZAÇÃO VIA ESTADO (Instantânea)
      await fetchProducts(); 
    }
  }

  async function handleDelete(productId) {
    if (!isAdmin || sessionLoading) return;
    if (window.confirm("Are you sure you want to delete this product?")) {
      const success = await adminTools.removeProduct(productId);
      if (success) {
        // ATUALIZAÇÃO VIA ESTADO (Instantânea)
        await fetchProducts(); 
      }
    }
  }

  function handleNewChange(e) {
    const { name, value } = e.target;
    setNewForm((prev) => ({ ...prev, [name]: value }));
  }

  async function addNewProduct(e) {
    e.preventDefault();
    if (!isAdmin || sessionLoading) return;

    const priceValue = parseFloat(newForm.price) || 0;

    const success = await adminTools.addProduct({
      title: newForm.title,
      description: newForm.description,
      price: priceValue,
      thumbnail: newForm.thumbnail,
    });
    if (success) {
      // RECARREGA A PÁGINA APÓS ADICIONAR (Como solicitado)
      window.location.reload(); 
    }
  }

  // --- Renderização Principal ---

  if (!session) {
    return (
      <div className={styles.container}>
        <h1>User not signed in!</h1>
        <Link to="/signin" className={styles.adminLink}>
          Sign In Now
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.userInfoSection}>
        {isAdmin ? (
          <h1 className={styles.adminTitle}>Admin Account ⭐</h1>
        ) : (
          <h1>User Account</h1>
        )}
        <div className={styles.userInfo}>
          <div className={styles.fields}>
            <label className={styles.label}>Username</label>
            <input className={styles.input} value={session.user.user_metadata?.username || "-"} readOnly />

            <label className={styles.label}>Email</label>
            <input className={styles.input} value={session.user.email || "-"} readOnly />

            <label className={styles.label}>ID</label>
            <input className={styles.input} value={session.user.id || "-"} readOnly />
          </div>
        </div>
        <button className={styles.button} onClick={handleSignOut} disabled={sessionLoading}>
          SIGN OUT
        </button>
      </div>

      {isAdmin && (
        <div className={styles.adminPanel}>
          <div className={styles.header}>
            <h2>Product Management 📦</h2>
            <button
              className={styles.addButton}
              onClick={() => setIsAdding(!isAdding)}
            >
              {isAdding ? (
                "Cancel Add"
              ) : (
                <>
                  <Plus size={20} /> Add New Product
                </>
              )}
            </button>
          </div>

          {isAdding && (
            <form className={styles.newForm} onSubmit={addNewProduct}>
              <h3>Add New Product</h3>
              <input
                type="text"
                name="title"
                placeholder="Title"
                value={newForm.title}
                onChange={handleNewChange}
                required
              />
              <textarea
                name="description"
                placeholder="Description"
                value={newForm.description}
                onChange={handleNewChange}
                required
              />
              <input
                type="number"
                name="price"
                placeholder="Price"
                value={newForm.price}
                onChange={handleNewChange}
                step="0.01"
                required
              />
              <input
                type="text"
                name="thumbnail"
                placeholder="Thumbnail URL"
                value={newForm.thumbnail}
                onChange={handleNewChange}
                required
              />
              <button type="submit" className={styles.saveButton}>
                <Save size={20} /> Save Product
              </button>
            </form>
          )}

          {loading ? (
            <p>Loading products for admin...</p>
          ) : error ? (
            <p className={styles.error}>{error}</p>
          ) : (
            <table className={styles.productTable}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Thumbnail</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.id}</td>
                    <td>
                      <img
                        src={product.thumbnail}
                        alt={product.title}
                        className={styles.thumbnail}
                      />
                    </td>
                    <td>
                      {editingId === product.id ? (
                        <input
                          type="text"
                          name="title"
                          value={editForm.title}
                          onChange={handleEditChange}
                        />
                      ) : (
                        product.title
                      )}
                    </td>
                    <td>
                      {editingId === product.id ? (
                        <textarea
                          name="description"
                          value={editForm.description}
                          onChange={handleEditChange}
                        />
                      ) : (
                        product.description.substring(0, 100) + "..."
                      )}
                    </td>
                    <td>
                      {editingId === product.id ? (
                        <input
                          type="number"
                          name="price"
                          value={editForm.price}
                          onChange={handleEditChange}
                          step="0.01"
                        />
                      ) : (
                        `$${product.price.toFixed(2)}`
                      )}
                    </td>
                    <td className={styles.actionsCell}>
                      {editingId === product.id ? (
                        <button
                          className={styles.actionButton}
                          onClick={() => saveEdit(product.id)}
                        >
                          <Save size={20} />
                        </button>
                      ) : (
                        <button
                          className={styles.actionButton}
                          onClick={() => startEdit(product)}
                        >
                          <Edit size={20} />
                        </button>
                      )}
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}