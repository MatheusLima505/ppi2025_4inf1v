import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "../utils/supabase";
import { SessionContext } from "./SessionContext";

export const CartContext = createContext({
  products: [],
  loading: false,
  error: null,
  cart: [],
  isAdmin: false,
  adminTools: {
    addProduct: () => {},
    removeProduct: () => {},
    updateProduct: () => {},
    fetchProducts: () => {},
  },
  addToCart: () => {},
  updateQtyCart: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
  fetchProducts: () => {},
});

export function CartProvider({ children }) {
  const { session, profile } = useContext(SessionContext);

  const userId = session?.user?.id;

  // 🔥 CORREÇÃO AQUI: admin vem da tabela profiles
  const isAdmin = profile?.admin === true;

  // --- Estado e Lógica de Produtos ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchProductsSupabase() {
    setLoading(true);
    const { data, error } = await supabase.from("product_1v").select();
    if (error) {
      setError(`Fetching products failed! ${error.message}`);
    } else {
      setProducts(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProductsSupabase();
  }, []);

  // --- Estado e Lógica do Carrinho ---
  const [cart, setCart] = useState([]);

  async function syncSingleItem(productId, quantity, isRemoval = false) {
    if (!userId) return;

    if (isRemoval) {
      await supabase
        .from("cart")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", productId);
    } else {
      await supabase.from("cart").upsert(
        { user_id: userId, product_id: productId, quantity },
        { onConflict: "user_id, product_id" }
      );
    }
  }

  useEffect(() => {
    async function loadCart() {
      if (products.length === 0 && loading) return;

      if (userId) {
        const { data: cartItems } = await supabase
          .from("cart")
          .select("product_id, quantity");

        if (cartItems) {
          const newCart = cartItems
            .map((item) => {
              const productDetail = products.find(
                (p) => p.id === item.product_id
              );
              return productDetail
                ? { ...productDetail, quantity: item.quantity }
                : null;
            })
            .filter(Boolean);

          setCart(newCart);
          localStorage.removeItem("localCart");
        }
      } else {
        const localCart = JSON.parse(localStorage.getItem("localCart") || "[]");
        setCart(localCart);
      }
    }

    loadCart();
  }, [userId, products.length, loading]);

  useEffect(() => {
    if (!userId) {
      localStorage.setItem("localCart", JSON.stringify(cart));
    }
  }, [cart, userId]);

  // --- Funções de Manipulação do Carrinho ---
  function addToCart(product) {
    setCart((prevCart) => {
      const existingProduct = prevCart.find((item) => item.id === product.id);
      let newCart;

      if (existingProduct) {
        const newQty = existingProduct.quantity + 1;
        newCart = prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: newQty } : item
        );
        syncSingleItem(product.id, newQty);
      } else {
        const newItem = { ...product, quantity: 1 };
        newCart = [...prevCart, newItem];
        syncSingleItem(product.id, 1);
      }
      return newCart;
    });
  }

  function removeFromCart(productId) {
    setCart((prevCart) => {
      const newCart = prevCart.filter((item) => item.id !== productId);
      syncSingleItem(productId, 0, true);
      return newCart;
    });
  }

  function updateQtyCart(productId, quantity) {
    if (quantity <= 0) return removeFromCart(productId);

    setCart((prevCart) => {
      const newCart = prevCart.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      );
      syncSingleItem(productId, quantity);
      return newCart;
    });
  }

  function clearCart() {
    setCart([]);

    if (userId) {
      supabase
        .from("cart")
        .delete()
        .eq("user_id", userId)
        .then(({ error }) => {
          if (error)
            console.error("Erro ao limpar carrinho no Supabase:", error);
        });
    } else {
      localStorage.removeItem("localCart");
    }
  }

  // --- Admin Tools ---
  const adminTools = {
    async addProduct(newProduct) {
      if (!isAdmin) return console.error("Acesso negado: Não é Admin.");

      const { data, error } = await supabase
        .from("product_1v")
        .insert([{ ...newProduct, created_at: new Date(), updated_at: new Date() }])
        .select();

      if (!error) {
        setProducts((prev) => [...prev, data[0]]);
        return true;
      }

      console.error("Erro ao adicionar produto:", error);
      return false;
    },

    async removeProduct(productId) {
      if (!isAdmin) return console.error("Acesso negado: Não é Admin.");

      const { error } = await supabase
        .from("product_1v")
        .delete()
        .eq("id", productId);

      if (!error) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        setCart((prevCart) => prevCart.filter((p) => p.id !== productId));
        return true;
      }

      console.error("Erro ao remover produto:", error);
      return false;
    },

    async updateProduct(productId, updatedFields) {
      if (!isAdmin) return console.error("Acesso negado: Não é Admin.");

      const { data, error } = await supabase
        .from("product_1v")
        .update({ ...updatedFields, updated_at: new Date() })
        .eq("id", productId)
        .select();

      if (!error) {
        const updatedProduct = data[0];
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? updatedProduct : p))
        );
        setCart((prevCart) =>
          prevCart.map((p) =>
            p.id === productId ? { ...p, ...updatedProduct } : p
          )
        );
        return true;
      }

      console.error("Erro ao atualizar produto:", error);
      return false;
    },

    fetchProducts: fetchProductsSupabase,
  };

  const context = {
    products,
    loading,
    error,
    cart,
    addToCart,
    updateQtyCart,
    removeFromCart,
    clearCart,
    adminTools,
    isAdmin,
    fetchProducts: fetchProductsSupabase,
  };

  return (
    <CartContext.Provider value={context}>{children}</CartContext.Provider>
  );
}
