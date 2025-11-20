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
  fetchProducts: () => {}, // Exposto para ser usado pelo painel admin
});

export function CartProvider({ children }) {
  const { session } = useContext(SessionContext);
  const userId = session?.user?.id;
  const isAdmin = session?.user?.user_metadata?.admin === true;

  // --- Estado e Lógica de Produtos ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchProductsSupabase() {
    setLoading(true);
    // RLS em product_1v permite que todos leiam
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

  // Função para sincronização imediata com o Supabase (INSERT/UPDATE/DELETE de item único)
  async function syncSingleItem(productId, quantity, isRemoval = false) {
    if (!userId) return; // Só sincroniza se autenticado
    console.log(userId,productId, quantity)
    if (isRemoval) {
        // RLS DELETE policy é verificada
        await supabase
            .from("cart")
            .delete()
            .eq("user_id", userId)
            .eq("product_id", productId);
    } else {
        // RLS INSERT/UPDATE policies são verificadas
        await supabase
            .from("cart")
            .upsert(
                { user_id: userId, product_id: productId, quantity: quantity },
                { onConflict: "user_id, product_id" } // Upsert (atualiza se existir, insere se não)
            );
    }
  }

  // 1. CARREGAR Carrinho (Supabase para usuários logados, Local Storage para anônimos)
  useEffect(() => {
    async function loadCart() {
      if (products.length === 0 && loading) return; // Espera os produtos carregarem

      if (userId) {
        // AUTENTICADO: Carregar do Supabase
        // RLS SELECT policy é verificada
        const { data: cartItems } = await supabase
          .from("cart")
          .select("product_id, quantity");

        if (cartItems) {
          const newCart = cartItems
            .map((item) => {
              const productDetail = products.find((p) => p.id === item.product_id);
              return productDetail ? { ...productDetail, quantity: item.quantity } : null;
            })
            .filter(Boolean);
          setCart(newCart);
          localStorage.removeItem("localCart"); // Limpa local após carregar
        }
      } else {
        // NÃO AUTENTICADO: Carregar do Local Storage
        const localCart = JSON.parse(localStorage.getItem("localCart") || "[]");
        setCart(localCart);
      }
    }
    loadCart();
  }, [userId, products.length, loading]);

  // 2. SINCRONIZAR Cart Local para Local Storage (Se Não Autenticado)
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
      syncSingleItem(productId, 0, true); // Chaveia a remoção no Supabase
      return newCart;
    });
  }

  function updateQtyCart(productId, quantity) {
    if (quantity <= 0) return removeFromCart(productId);

    setCart((prevCart) => {
      const newCart = prevCart.map((item) =>
        item.id === productId ? { ...item, quantity: quantity } : item
      );
      syncSingleItem(productId, quantity);
      return newCart;
    });
  }

  /**
   * Corrige a deleção completa do carrinho no Supabase.
   */
  function clearCart() {
    // 1. Limpa o estado visual local
    setCart([]);
    
    // 2. Limpa a persistência
    if (userId) {
        // AUTENTICADO: Deleta TUDO do carrinho deste usuário no Supabase
        supabase.from("cart")
                .delete()
                .eq("user_id", userId)
                .then(({ error }) => {
                    if (error) console.error("Erro ao limpar carrinho no Supabase:", error);
                });
    } else {
        // NÃO AUTENTICADO: Limpa o Local Storage
        localStorage.removeItem("localCart");
    }
  }


  // --- Lógica de CRUD de Admin ---
  const adminTools = {
    async addProduct(newProduct) {
        if (!isAdmin) return console.error("Acesso negado: Não é Admin.");
        // RLS INSERT policy é verificada
        const { data, error } = await supabase
            .from("product_1v")
            .insert([{ ...newProduct, created_at: new Date(), updated_at: new Date() }])
            .select();
        if (!error) {
            setProducts((prev) => [...prev, ...data[0]]);
            return true;
        }
        console.error("Erro ao adicionar produto:", error);
        return false;
    },
    async removeProduct(productId) {
        if (!isAdmin) return console.error("Acesso negado: Não é Admin.");
        // RLS DELETE policy é verificada
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
        // RLS UPDATE policy é verificada
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
            setCart((prevCart) => prevCart.map((p) => (p.id === productId ? { ...p, ...updatedProduct } : p)));
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