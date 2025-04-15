import axios from "axios";

export function getProductInfo(productId) {
  return axios.get(
    `https://api.dailyneeds.in/api/product/info?outlet_id=4&product_id=${productId}`
  );
}
