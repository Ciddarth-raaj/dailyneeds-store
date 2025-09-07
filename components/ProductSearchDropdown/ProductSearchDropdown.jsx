import React, { useState, useEffect, useMemo } from "react";
import ReactSelect from "react-select";
import product from "../../helper/product";
import styles from "./index.module.css";

const ProductSearchDropdown = ({
  value,
  onChange,
  isDisabled = false,
  placeholder = "Select Product",
  classNamePrefix = "transparentSelect",
}) => {
  const [productOptions, setProductOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [internalSearchTerm, setInternalSearchTerm] = useState("");

  // Fetch products based on internal search term
  useEffect(() => {
    // Don't make API call if a value is already selected and no search term
    if (value && !internalSearchTerm) {
      return;
    }

    async function fetchProducts() {
      try {
        setLoading(true);
        const data = await product.getFilteredProduct(
          internalSearchTerm,
          0,
          100
        );
        setProductOptions(
          (data || []).map((prod) => ({
            value: prod.product_id,
            label: `${prod.product_id} - ${prod.de_name}`,
            ...prod,
          }))
        );
      } catch (err) {
        console.error("Error fetching products:", err);
        setProductOptions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [internalSearchTerm, value]);

  // Handle value changes - reset search when value is cleared
  useEffect(() => {
    if (!value) {
      setInternalSearchTerm("");
    }
  }, [value]);

  // Memoize the selected value to prevent unnecessary re-renders
  const selectedValue = useMemo(() => {
    return productOptions.find((opt) => opt.value === value) || null;
  }, [productOptions, value]);

  // Custom option renderer
  const customOptionRenderer = ({
    innerProps,
    innerRef,
    data,
    isFocused,
    isSelected,
  }) => {
    const optionClasses = [
      styles.customOption,
      isSelected ? styles.selected : "",
      isFocused ? styles.focused : "",
    ].join(" ");

    return (
      <div ref={innerRef} {...innerProps} className={optionClasses}>
        <div className={styles.optionTitle}>{data.de_name}</div>
        <div
          className={`${styles.optionSubtitle} ${
            isSelected ? styles.selected : ""
          }`}
        >
          ID: {data.product_id}
          {data.brand_name && <p>Brand: {data.brand_name}</p>}
          {data.category_name && <p>Category: {data.category_name}</p>}
        </div>
        {data.price && (
          <div
            className={`${styles.optionPrice} ${
              isSelected ? styles.selected : ""
            }`}
          >
            ₹{data.price}
          </div>
        )}
      </div>
    );
  };

  // Custom single value renderer with clear button
  const customSingleValueRenderer = ({ data }) => (
    <div className={styles.singleValue}>
      <div className={styles.singleValueContent}>
        <span className={styles.singleValueTitle}>{data.de_name}</span>
        <span className={styles.singleValueSubtitle}>({data.product_id})</span>
      </div>
      <button
        className={styles.clearButton}
        onClick={(e) => {
          e.stopPropagation();
          onChange(null);
        }}
        type="button"
        aria-label="Clear selection"
      >
        ×
      </button>
    </div>
  );

  // If a value is selected, show text display instead of dropdown
  if (selectedValue) {
    return (
      <div className={styles.selectedProductDisplay}>
        <div className={styles.selectedProductContent}>
          <div className={styles.selectedProductTitle}>
            {selectedValue.de_name}
          </div>
          <div className={styles.selectedProductDetails}>
            <span>ID: {selectedValue.product_id}</span>
          </div>
        </div>
        <button
          className={styles.clearButton}
          onClick={() => onChange(null)}
          type="button"
          aria-label="Clear selection"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <ReactSelect
      options={productOptions}
      value={selectedValue}
      onChange={onChange}
      isDisabled={isDisabled}
      isLoading={loading}
      isSearchable
      placeholder={placeholder}
      classNamePrefix={classNamePrefix}
      noOptionsMessage={() =>
        loading ? "Loading products..." : "No products found"
      }
      loadingMessage={() => "Loading products..."}
      onInputChange={(inputValue) => {
        setInternalSearchTerm(inputValue);
        return inputValue;
      }}
      inputValue={internalSearchTerm}
      menuPortalTarget={typeof window !== "undefined" && document.body}
      components={{
        Option: customOptionRenderer,
        SingleValue: customSingleValueRenderer,
      }}
    />
  );
};

export default ProductSearchDropdown;
