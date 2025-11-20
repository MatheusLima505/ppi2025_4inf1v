import styles from "./Product.module.css";
import { useContext } from "react";
import { CartContext } from "../context/CartContext";
import { Link } from "react-router";
import { SessionContext } from "../context/SessionContext";

export function Product({ product }) {
  const { addToCart } = useContext(CartContext);
    const { session } = useContext(SessionContext)

  return (
    <div key={product.id} className={styles.productCard}>
      <img
        src={product.thumbnail}
        alt={product.title}
        className={styles.productImage}
      />
      <h2 className={styles.productTitle}>{product.title}</h2>
      <p className={styles.productDescription}>{product.description}</p>
      <p className={styles.productPrice}>${product.price}</p>
      {/* <Link to="/cart"> */}
      { session && (
      <button
        onClick={() => {
          addToCart(product);
        }}
        className={styles.productButton}
      >
        ADD TO CART
      </button>
      )}
      {/* </Link> */}
    </div>
  );
}
