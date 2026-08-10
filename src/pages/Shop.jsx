import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../utils/firebase';
import MainLayout from '../components/MainLayout';
import CloudinaryImageUpload from '../components/CloudinaryImageUpload';

const emptyProduct = () => ({
  name: '',
  price: '',
  category: '',
  description: '',
  images: [],
  variants: []
});

const emptyVariant = () => ({
  id: `variant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  stock: '',
  price: ''
});

// Normalize any legacy product shape (single `image`) into the new `images` array shape
const normalizeProductForForm = (product) => {
  let images = [];
  if (Array.isArray(product.images)) {
    images = product.images;
  } else if (product.image) {
    images = [product.image];
  }

  let variants = [];
  if (Array.isArray(product.variants)) {
    variants = product.variants.map((v) => ({
      id: v.id || `variant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: v.name || '',
      stock: v.stock !== undefined && v.stock !== null ? v.stock.toString() : '',
      price: v.price !== undefined && v.price !== null ? v.price.toString() : ''
    }));
  }

  return {
    ...product,
    price: product.price?.toString() || '',
    category: product.category || '',
    images,
    variants
  };
};

const getImageUrl = (img) => {
  if (!img) return null;
  return typeof img === 'string' ? img : (img.secure_url || img.url);
};

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState(emptyProduct());
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const productsQuery = query(
        collection(db, 'products'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(productsQuery);
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetNewProduct = () => {
    setNewProduct(emptyProduct());
  };

  const openAddModal = () => {
    resetNewProduct();
    setEditingProduct(null);
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(normalizeProductForForm(product));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    resetNewProduct();
  };

  const isEditing = !!editingProduct;
  const formData = isEditing ? editingProduct : newProduct;
  const setFormData = isEditing ? setEditingProduct : setNewProduct;

  // Image handlers (multiple images)
  const handleAddImage = (imageData) => {
    if (!imageData) return;
    setFormData({ ...formData, images: [...(formData.images || []), imageData] });
  };

  const handleRemoveImage = (index) => {
    const updatedImages = [...(formData.images || [])];
    updatedImages.splice(index, 1);
    setFormData({ ...formData, images: updatedImages });
  };

  // Variant handlers
  const handleAddVariant = () => {
    setFormData({ ...formData, variants: [...(formData.variants || []), emptyVariant()] });
  };

  const handleVariantChange = (index, field, value) => {
    const updatedVariants = [...(formData.variants || [])];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value };
    setFormData({ ...formData, variants: updatedVariants });
  };

  const handleRemoveVariant = (index) => {
    const updatedVariants = [...(formData.variants || [])];
    updatedVariants.splice(index, 1);
    setFormData({ ...formData, variants: updatedVariants });
  };

  const buildProductPayload = (data) => ({
    name: data.name,
    price: parseFloat(data.price),
    category: data.category || '',
    description: data.description || '',
    images: data.images || [],
    variants: (data.variants || []).map((v) => ({
      id: v.id,
      name: v.name || '',
      stock: v.stock !== '' && v.stock !== undefined ? parseInt(v.stock, 10) : 0,
      price: v.price !== '' && v.price !== undefined && v.price !== null ? parseFloat(v.price) : null
    }))
  });

  // Add new product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;

    setSaving(true);
    try {
      const productData = {
        ...buildProductPayload(newProduct),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'products'), productData);

      resetNewProduct();
      setShowModal(false);
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Error adding product. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Update product
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct.name || !editingProduct.price) return;

    setSaving(true);
    try {
      const updateData = {
        ...buildProductPayload(editingProduct),
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'products', editingProduct.id), updateData);

      setEditingProduct(null);
      setShowModal(false);
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error updating product. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await deleteDoc(doc(db, 'products', productId));
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product. Please try again.');
    }
  };

  const handleSubmit = isEditing ? handleUpdateProduct : handleAddProduct;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Shop</h1>
            <p className="text-gray-600">Manage shop products - add, edit or remove items available in the store.</p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-lg">Loading products...</div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Current Products</h3>
                {products.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No products added yet. Click "Add Product" above to add your first product.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map((product) => {
                      const productImages = Array.isArray(product.images)
                        ? product.images
                        : (product.image ? [product.image] : []);
                      const firstImageUrl = getImageUrl(productImages[0]);

                      return (
                        <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-start space-x-4">
                                {/* Product Images */}
                                <div className="flex-shrink-0">
                                  {firstImageUrl ? (
                                    <div className="flex flex-col items-center gap-2">
                                      <img
                                        src={firstImageUrl}
                                        alt="Product"
                                        className="w-32 h-32 object-cover rounded"
                                      />
                                      {productImages.length > 1 && (
                                        <span className="text-xs text-gray-500">
                                          +{productImages.length - 1} more image{productImages.length - 1 > 1 ? 's' : ''}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="w-32 h-32 bg-gray-200 rounded flex items-center justify-center">
                                      <span className="text-gray-500 text-sm">No image</span>
                                    </div>
                                  )}
                                </div>

                                {/* Product Info */}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-lg font-medium text-gray-900">{product.name}</h4>
                                    {product.category && (
                                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                        {product.category}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-md font-semibold text-orange-600 mb-2">
                                    ₹{Number(product.price).toFixed(2)}
                                  </p>
                                  {product.description && (
                                    <p className="text-sm text-gray-500 mb-2">
                                      {product.description}
                                    </p>
                                  )}
                                  {Array.isArray(product.variants) && product.variants.length > 0 && (
                                    <div className="mb-2">
                                      <p className="text-xs font-medium text-gray-700 mb-1">Variants:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {product.variants.map((v, idx) => (
                                          <span
                                            key={v.id || idx}
                                            className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded border border-orange-200"
                                          >
                                            {v.name || 'Variant'} · Stock: {v.stock ?? 0}
                                            {v.price !== null && v.price !== undefined && v.price !== '' && (
                                              <> · ₹{Number(v.price).toFixed(2)}</>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-500">
                                    Added: {product.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={() => openEditModal(product)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={closeModal}
          ></div>

          {/* Modal Content */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {isEditing ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter product name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter product price"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g. Apparel, Paddles, Accessories"
                />
              </div>

              {/* Product Images (multiple) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images
                </label>
                <div className="flex flex-wrap gap-4 mb-3">
                  {(formData.images || []).map((img, idx) => {
                    const url = getImageUrl(img);
                    return (
                      <div key={idx} className="relative">
                        <img
                          src={url}
                          alt={`Product ${idx + 1}`}
                          className="w-24 h-24 object-cover rounded border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
                <CloudinaryImageUpload
                  onImageUpload={handleAddImage}
                  currentImage={null}
                  label="Add Product Image"
                  uploadType="shop"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter product description (optional)"
                  rows={4}
                />
              </div>

              {/* Variants */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Variants
                  </label>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Variant
                  </button>
                </div>

                {(formData.variants || []).length === 0 ? (
                  <p className="text-sm text-gray-400">No variants added. Click "Add Variant" to add product options (e.g. Size, Color).</p>
                ) : (
                  <div className="space-y-3">
                    {formData.variants.map((variant, idx) => (
                      <div key={variant.id || idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center border border-gray-200 rounded-md p-3">
                        <div className="md:col-span-5">
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) => handleVariantChange(idx, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Variant name (e.g. Small, Red)"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <input
                            type="number"
                            min="0"
                            value={variant.stock}
                            onChange={(e) => handleVariantChange(idx, 'stock', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Stock qty"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={variant.price}
                            onChange={(e) => handleVariantChange(idx, 'price', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Price (optional)"
                          />
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(idx)}
                            className="text-red-600 hover:text-red-800"
                            title="Remove variant"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {saving ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
