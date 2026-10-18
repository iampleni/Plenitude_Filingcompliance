import { Link } from 'react-router-dom';
import { inr } from '../api';

export default function ProductCard({ product }) {
  return (
    <div className="card product-card">
      <span className="cat">{product.category}</span>
      <h3>{product.name}</h3>
      <p className="desc">{product.description}</p>
      <div className="row-between mt-2">
        <div className="price">
          {inr(product.price)}
          <br />
          <small>+ {Number(product.tax_rate)}% GST · {product.turnaround_days} days</small>
        </div>
        <Link className="btn btn-sm" to={`/product/${product.id}`}>
          View & add
        </Link>
      </div>
    </div>
  );
}
