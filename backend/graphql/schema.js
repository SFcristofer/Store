const { gql } = require('apollo-server-express');

// Definimos los tipos de datos y las operaciones disponibles
const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    store: Store
    cart: Cart # Nuevo campo para el carrito del usuario
    addresses: [Address!] # Nuevo campo para las direcciones del usuario
    paymentMethods: [PaymentMethod!] # Nuevo campo para los métodos de pago del usuario
    verificationToken: String
    isVerified: Boolean
    status: String
  }

  type Cart {
    id: ID!
    user: User!
    items: [CartItem!]!
  }

  type CartItem {
    id: ID!
    cart: Cart!
    product: Product!
    quantity: Int!
  }

  type Store {
    id: ID!
    name: String!
    description: String!
    imageUrl: String # Nuevo campo para la URL de la imagen de la tienda
    owner: User!
    products: [Product!]
    averageRating: Float # New field for store's average rating
  }

  type Category {
    id: ID!
    name: String!
  }

  type Product {
    id: ID!
    name: String!
    description: String!
    price: Float!
    imageUrl: String
    stock: Int!
    store: Store!
    category: Category
    reviews: [ProductReview!]
    averageRating: Float
  }

  type ProductReview {
    id: ID!
    rating: Int!
    comment: String
    user: User!
    product: Product!
  }

  type Order {
    id: ID!
    totalAmount: Float!
    status: String!
    deliveryAddress: String!
    customer: User!
    store: Store!
    items: [OrderItem!]
    createdAt: String!
  }

  type OrderItem {
    id: ID!
    quantity: Int!
    priceAtOrder: Float!
    product: Product!
  }

  type Address {
    id: ID!
    street: String!
    city: String!
    state: String!
    zipCode: String!
    country: String!
    isDefault: Boolean!
    user: User!
  }

  type PaymentMethod {
    id: ID!
    paymentMethodId: String! # ID de la pasarela de pago
    brand: String! # Ej: 'visa', 'mastercard'
    last4: String! # Últimos 4 dígitos
    isDefault: Boolean!
    user: User!
  }

  type DashboardStats {
    totalUsers: Int!
    totalStores: Int!
    totalProducts: Int!
    totalOrders: Int!
    totalSalesVolume: Float!
  }

  type SalesDataPoint {
    date: String!
    totalSales: Float!
  }

  type UserRegistrationDataPoint {
    date: String!
    count: Int!
  }

  type ProductSalesData {
    productId: ID!
    productName: String!
    totalQuantitySold: Int!
    totalRevenue: Float!
  }

  type OrderStatusDistributionData {
    status: String!
    count: Int!
    percentage: Float!
  }

  type StorePerformanceData {
    storeId: ID!
    storeName: String!
    totalRevenue: Float!
    totalOrders: Int!
  }

  type CategorySalesData {
    categoryId: ID!
    categoryName: String!
    totalRevenue: Float!
    totalQuantitySold: Int!
  }

  type ProductsPublishedByStoreData {
    storeId: ID!
    storeName: String!
    productCount: Int!
  }

  type ProductSoldData {
    productId: ID!
    productName: String!
    totalQuantitySold: Int!
  }

  type OrdersCreatedByStoreData {
    storeId: ID!
    storeName: String!
    orderCount: Int!
  }

  type OrdersCreatedByBuyerData {
    userId: ID!
    userName: String!
    orderCount: Int!
  }

  type CancelledOrdersData {
    date: String!
    count: Int!
    totalAmount: Float!
  }

  # El tipo "Query" define las operaciones de lectura
  type Query {
    hello: String
    me: User
    getAllProducts(
      categoryId: ID
      minPrice: Float
      maxPrice: Float
      search: String
      sortBy: String
      sortOrder: String
      storeId: ID # Añadimos el filtro por storeId
    ): [Product!]
    getAllStores(search: String, sortBy: String, sortOrder: String): [Store!]
    getStoreById(id: ID!): Store
    getAllCategories: [Category!]
    getProductsByCategory(categoryId: ID!): [Product!]
    customerOrders: [Order!] # Nueva consulta para pedidos del cliente
    myCart: Cart # Nueva consulta para obtener el carrito del usuario
    myAddresses: [Address!] # Nueva consulta para obtener las direcciones del usuario
    myPaymentMethods: [PaymentMethod!] # Nueva consulta para obtener los métodos de pago del usuario
    getProductById(id: ID!): Product # Nueva consulta para obtener un producto por ID
    sellerOrders: [Order!]
    adminGetAllUsers: [User!]! # New admin query
    adminGetAllStores: [Store!]! # New admin query
    adminGetAllProducts: [Product!]! # New admin query
    adminGetAllOrders: [Order!]! # New admin query
    adminGetDashboardStats: DashboardStats!
    adminGetSalesData(period: String!, startDate: String, endDate: String): [SalesDataPoint!]
    adminGetUserRegistrations(period: String!, startDate: String, endDate: String): [UserRegistrationDataPoint!]
    adminGetTopSellingProducts(limit: Int = 10, startDate: String, endDate: String): [ProductSalesData!]
    adminGetOrderStatusDistribution(startDate: String, endDate: String): [OrderStatusDistributionData!]
    adminGetTopPerformingStores(limit: Int = 10, startDate: String, endDate: String): [StorePerformanceData!]
        adminGetCategorySales(startDate: String, endDate: String): [CategorySalesData!]!
    adminGetProductsPublishedByStore: [ProductsPublishedByStoreData!]!
    adminGetProductsSold(startDate: String, endDate: String): [ProductSoldData!]!
    adminGetOrdersCreatedByStores(startDate: String, endDate: String): [OrdersCreatedByStoreData!]!
    adminGetOrdersCreatedByBuyers(startDate: String, endDate: String): [OrdersCreatedByBuyerData!]!
    adminGetNewUsersCount(period: String!, startDate: String, endDate: String): [UserRegistrationDataPoint!]!
    adminGetNewStoresCount(period: String!, startDate: String, endDate: String): [UserRegistrationDataPoint!]!
    adminGetCancelledOrders(period: String!, startDate: String, endDate: String): [CancelledOrdersData!]!
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
    priceAtOrder: Float!
  }

  input CreateOrderInput {
    storeId: ID!
    addressId: ID!
    items: [OrderItemInput!]!
  }

  input CreateAddressInput {
    street: String!
    city: String!
    state: String!
    zipCode: String!
    country: String!
    isDefault: Boolean
  }

  input UpdateAddressInput {
    id: ID!
    street: String
    city: String
    state: String
    zipCode: String
    country: String
    isDefault: Boolean
  }

  input CreatePaymentMethodInput {
    token: String! # Este sería el token de la pasarela, ej: "tok_visa"
    isDefault: Boolean
  }

  input UpdatePaymentMethodInput {
    id: ID!
    isDefault: Boolean
  }

  input CreateProductReviewInput {
    productId: ID!
    rating: Int!
    comment: String
  }

  enum OrderStatus {
    payment_pending
    payment_confirmed
    delivery_agreed
    delivered_payment_received
    cancelled
  }

  # El tipo "Mutation" define las operaciones de escritura (crear, actualizar, borrar)
  type Mutation {
    registerUser(name: String!, email: String!, password: String!): String!
    loginUser(email: String!, password: String!): String!

    createStore(name: String!, description: String!, imageUrl: String): Store!
    updateStore(id: ID!, name: String, description: String, imageUrl: String): Store!
    updateProduct(
      id: ID!
      name: String
      description: String
      price: Float
      imageUrl: String
      stock: Int
      categoryId: ID
    ): Product!
    deleteProduct(id: ID!): Boolean!
    createProduct(
      name: String!
      description: String!
      price: Float!
      storeId: ID!
      categoryId: ID!
      imageUrl: String
      stock: Int!
    ): Product!
    createCategory(name: String!): Category!
    updateCategory(id: ID!, name: String!): Category!
    deleteCategory(id: ID!): Boolean!
    updateUser(id: ID!, name: String, email: String, password: String): User!
    becomeSeller: String! # No necesita ID, el usuario autenticado se convierte en vendedor
    createOrder(input: CreateOrderInput!): Order! # Nueva mutación para crear pedidos
    addToCart(productId: ID!, quantity: Int!): Cart!
    removeFromCart(productId: ID!): Cart!
    updateCartItemQuantity(productId: ID!, quantity: Int!): Cart!
    clearCart: Cart!

    createAddress(input: CreateAddressInput!): Address!
    updateAddress(input: UpdateAddressInput!): Address!
    deleteAddress(id: ID!): Boolean!

    createPaymentMethod(input: CreatePaymentMethodInput!): PaymentMethod!
    updatePaymentMethod(input: UpdatePaymentMethodInput!): PaymentMethod!
    deletePaymentMethod(id: ID!): Boolean!

    createProductReview(input: CreateProductReviewInput!): ProductReview!

    updateOrderStatus(orderId: ID!, status: OrderStatus!): Order!

    requestPasswordReset(email: String!): String!
    resetPassword(token: String!, newPassword: String!): String!
    verifyEmail(token: String!): String! # New mutation
    deactivateAccount: String! # New mutation
    deleteAccount: String! # New mutation
    _setUserRole(email: String!, role: String!): Boolean
    adminUpdateUserRole(userId: ID!, role: String!): User!
    adminUpdateUserStatus(userId: ID!, status: String!): User!
    adminUpdateStoreStatus(storeId: ID!, status: String!): Store!
    adminUpdateProductStatus(productId: ID!, status: String!): Product!
  }
`;

module.exports = typeDefs;
