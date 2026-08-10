import React from 'react';
import styles from '../styles/AddFixtures.module.css';

export default function ModernFixtureModal({
  isOpen,
  title,
  onClose,
  onSubmit,
  children,
  submitText = 'Create',
  cancelText = 'Cancel',
  isLoading = false
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:opacity-80 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className={styles.modalBody}>
          {children}

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </button>
            <button
              type="submit"
              className={styles.buttonPrimary}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className={styles.loadingSpinner}></span>
                  {submitText}
                </>
              ) : (
                submitText
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
