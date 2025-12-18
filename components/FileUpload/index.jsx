import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import styles from "./FileUpload.module.css";
import toast from "react-hot-toast";

const FileUpload = ({
  value,
  onChange,
  maxSize = 5242880, // 5MB default
  accept,
  disabled = false,
  placeholderText = "Drag & drop a file here, or click to select",
  width = "100%",
}) => {
  const onDropAccepted = useCallback(
    (acceptedFiles) => {
      console.log("onDropAccepted called with:", acceptedFiles);
      if (acceptedFiles?.length > 0) {
        console.log("Calling onChange with:", acceptedFiles[0]);
        onChange?.(acceptedFiles[0]);
      }
    },
    [onChange]
  );

  const onDropRejected = useCallback(
    (fileRejections) => {
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach((error) => {
          if (error.code === "file-too-large") {
            toast.error(
              `File ${file.name} is too large. Max size is ${
                maxSize / 1024 / 1024
              }MB`
            );
          } else if (error.code === "file-invalid-type") {
            toast.error(`File ${file.name} is not a valid type`);
          } else {
            toast.error(`Error with file ${file.name}: ${error.message}`);
          }
        });
      });
    },
    [maxSize]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDropAccepted,
    onDropRejected,
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
