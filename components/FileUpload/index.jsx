import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import styles from "./FileUpload.module.css";

const FileUpload = ({
  value,
  onChange,
  maxSize = 5242880, // 5MB default
  accept,
  disabled = false,
  placeholderText = "Drag & drop a file here, or click to select",
  width = "100%",
}) => {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles?.length > 0) {
        onChange?.(acceptedFiles[0]);
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    disabled,
    multiple: false,
  });

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange?.(null);
  };

  return (
    <div className={styles.fileUpload} style={{ width }}>
      <div
        {...getRootProps()}
        className={`${styles.dropzone} ${
          isDragActive ? styles.dragActive : ""
        } ${disabled ? styles.disabled : ""}`}
      >
        <input {...getInputProps()} />
        {value ? (
          <div className={styles.fileInfo}>
            <i className="fa-regular fa-file" />
            <span className={styles.fileName}>{value.name}</span>
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className={styles.removeFile}
              >
                <i className="fa-solid fa-times" />
              </button>
            )}
          </div>
        ) : (
          <div className={styles.placeholder}>
            <i className="fa-solid fa-cloud-arrow-up" />
            <p className={styles.placeholderText}>
              {isDragActive ? "Drop the file here" : placeholderText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
