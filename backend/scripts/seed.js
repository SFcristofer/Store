const fetch = require('node-fetch').default;

const API_URL = 'http://localhost:4000/graphql';

const USERS_TO_ADD = [
  { email: 'seller1@example.com', password: 'password123', name: 'Alice Seller', role: 'seller' },
  { email: 'seller2@example.com', password: 'password123', name: 'Bob Seller', role: 'seller' },
  { email: 'seller3@example.com', password: 'password123', name: 'Charlie Seller', role: 'seller' },
  { email: 'seller4@example.com', password: 'password123', name: 'Diana Seller', role: 'seller' },
  { email: 'seller5@example.com', password: 'password123', name: 'Eve Seller', role: 'seller' },
  {
    email: 'customer1@example.com',
    password: 'password123',
    name: 'Frank Customer',
    role: 'customer',
  },
  { email: 'customer2@example.com', password: 'password123', name: 'Grace Customer', role: 'customer' },
  { email: 'admin@example.com', password: 'adminpassword', name: 'Admin User', role: 'admin' },
];

const CATEGORIES_TO_ADD = [
  { name: 'Fruits & Vegetables' },
  { name: 'Baked Goods' },
  { name: 'Beverages' },
  { name: 'Crafts & Handmade' },
  { name: 'Dairy & Eggs' },
  { name: 'Meat & Seafood' },
  { name: 'Snacks & Sweets' },
  { name: 'Health & Beauty' },
  { name: 'Home & Garden' },
  { name: 'Pet Supplies' },
  { name: 'Electronics' },
  { name: 'Books' },
  { name: 'Clothing' },
  { name: 'Toys' },
  { name: 'Sports' },
];

const STORES_AND_PRODUCTS = [
  {
    sellerEmail: 'seller1@example.com',
    store: {
      name: 'Green Grocer',
      description: 'Fresh, organic produce from local farms.',
      imageUrl: '/images/store-placeholder.svg',
    },
    products: [
      {
        name: 'Organic Apples',
        description: 'Crisp and sweet.',
        price: 2.99,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Fruits & Vegetables',
        stock: 100,
      },
      {
        name: 'Local Carrots',
        description: 'Freshly pulled from the ground.',
        price: 1.5,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Fruits & Vegetables',
        stock: 100,
      },
      {
        name: 'Farm Eggs (Dozen)',
        description: 'Free-range, organic eggs.',
        price: 4.5,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Dairy & Eggs',
        stock: 100,
      },
      {
        name: 'Artisan Bread',
        description: 'Sourdough, baked daily.',
        price: 5.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Baked Goods',
        stock: 100,
      },
      {
        name: 'Blueberries',
        description: 'Fresh, sweet blueberries.',
        price: 3.5,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Fruits & Vegetables',
        stock: 100,
      },
      {
        name: 'Milk (Gallon)',
        description: 'Organic whole milk.',
        price: 4.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Dairy & Eggs',
        stock: 100,
      },
    ],
  },
  {
    sellerEmail: 'seller2@example.com',
    store: {
      name: 'The Coffee Bean',
      description: 'Premium roasted coffee beans and teas.',
      imageUrl: '/images/store-placeholder.svg',
    },
    products: [
      {
        name: 'Espresso Blend',
        description: 'Dark roast, rich flavor.',
        price: 12.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Beverages',
        stock: 100,
      },
      {
        name: 'Green Tea Leaves',
        description: 'Loose leaf, calming.',
        price: 8.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Beverages',
        stock: 100,
      },
      {
        name: 'Ceramic Mug',
        description: 'Handmade, 12oz.',
        price: 15.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Crafts & Handmade',
        stock: 100,
      },
      {
        name: 'Chocolate Chip Cookies',
        description: 'Freshly baked, gooey.',
        price: 3.5,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Snacks & Sweets',
        stock: 100,
      },
      {
        name: 'French Press',
        description: 'For perfect coffee brewing.',
        price: 25.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Home & Garden',
        stock: 100,
      },
      {
        name: 'Herbal Tea Sampler',
        description: 'Variety of soothing teas.',
        price: 10.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Beverages',
        stock: 100,
      },
    ],
  },
  {
    sellerEmail: 'seller3@example.com',
    store: {
      name: 'Tech Gadgets',
      description: 'Latest electronics and accessories.',
      imageUrl: '/images/store-placeholder.svg',
    },
    products: [
      {
        name: 'Wireless Earbuds',
        description: 'Noise-cancelling, long battery.',
        price: 79.99,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Electronics',
        stock: 100,
      },
      {
        name: 'Portable Charger',
        description: '10000mAh, fast charging.',
        price: 29.99,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Electronics',
        stock: 100,
      },
      {
        name: 'Smartwatch',
        description: 'Fitness tracking, notifications.',
        price: 129.99,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Electronics',
        stock: 100,
      },
    ],
  },
  {
    sellerEmail: 'seller4@example.com',
    store: {
      name: 'Bookworms Haven',
      description: 'New and classic books for every reader.',
      imageUrl: '/images/store-placeholder.svg',
    },
    products: [
      {
        name: 'Classic Novel',
        description: 'Timeless literature.',
        price: 15.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Books',
        stock: 100,
      },
      {
        name: 'Cookbook: Italian Cuisine',
        description: 'Authentic recipes.',
        price: 22.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Books',
        stock: 100,
      },
      {
        name: 'Childrens Picture Book',
        description: 'Colorful and engaging.',
        price: 10.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Books',
        stock: 100,
      },
    ],
  },
  {
    sellerEmail: 'seller5@example.com',
    store: {
      name: 'Fashion Forward',
      description: 'Trendy apparel for all seasons.',
      imageUrl: '/images/store-placeholder.svg',
    },
    products: [
      {
        name: 'Summer Dress',
        description: 'Light and airy.',
        price: 35.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Clothing',
        stock: 100,
      },
      {
        name: 'Denim Jeans',
        description: 'Comfortable and stylish.',
        price: 45.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Clothing',
        stock: 100,
      },
      {
        name: 'Graphic T-Shirt',
        description: 'Unique design.',
        price: 20.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Clothing',
        stock: 100,
      },
    ],
  },
  {
    sellerEmail: 'seller1@example.com',
    store: {
      name: 'Toy Chest',
      description: 'Fun and educational toys for kids.',
      imageUrl: '/images/store-placeholder.svg',
    },
    products: [
      {
        name: 'Building Blocks Set',
        description: 'Creative play.',
        price: 25.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Toys',
        stock: 100,
      },
      {
        name: 'Plush Teddy Bear',
        description: 'Soft and cuddly.',
        price: 18.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Toys',
        stock: 100,
      },
    ],
  },
  {
    sellerEmail: 'seller2@example.com',
    store: {
      name: 'Sports Gear',
      description: 'Equipment for your active lifestyle.',
      imageUrl: '/images/store-placeholder.svg',
    },
    products: [
      {
        name: 'Yoga Mat',
        description: 'Non-slip, comfortable.',
        price: 30.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Sports',
        stock: 100,
      },
      {
        name: 'Resistance Bands Set',
        description: 'For full body workout.',
        price: 15.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Sports',
        stock: 100,
      },
    ],
  },
  {
    sellerEmail: 'seller3@example.com',
    store: {
      name: 'Home Decor Hub',
      description: 'Stylish decorations for your home.',
      imageUrl: '/images/store-placeholder.svg',
    },
    products: [
      {
        name: 'Decorative Vase',
        description: 'Modern ceramic design.',
        price: 28.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Home & Garden',
        stock: 100,
      },
      {
        name: 'Scented Candles Set',
        description: 'Relaxing aromas.',
        price: 20.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Home & Garden',
        stock: 100,
      },
    ],
  },
  {
    sellerEmail: 'seller4@example.com',
    store: {
      name: 'Healthy Living',
      description: 'Supplements and natural health products.',
      imageUrl: '/images/store-placeholder.svg',
    },
    products: [
      {
        name: 'Vitamin C Supplements',
        description: 'Immune support.',
        price: 12.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Health & Beauty',
        stock: 100,
      },
      {
        name: 'Protein Powder',
        description: 'Vanilla flavored, 1lb.',
        price: 35.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Health & Beauty',
        stock: 100,
      },
    ],
  },
  {
    sellerEmail: 'seller5@example.com',
    store: {
      name: 'Gourmet Meats',
      description: 'Premium cuts for the discerning chef.',
      imageUrl: '/images/store-placeholder.svg',
    },
    products: [
      {
        name: 'Wagyu Beef Steak',
        description: 'Finest quality, melt-in-mouth.',
        price: 50.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Meat & Seafood',
        stock: 100,
      },
      {
        name: 'Salmon Fillet',
        description: 'Fresh, wild-caught.',
        price: 18.0,
        imageUrl: '/images/product-placeholder.svg',
        category: 'Meat & Seafood',
        stock: 100,
      },
    ],
  },
];

async function graphqlRequest(query, variables = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();
  if (data.errors) {
    console.error('GraphQL Errors:', data.errors);
    throw new Error(data.errors[0].message);
  }
  return data.data;
}

async function seedDatabase() {
  const sellerTokens = {};
  const categoryMap = {};

  try {
    // 1. Crear usuarios
    // NOTA: Este script asume una base de datos limpia.
    // Debido a la configuración del servidor (force: true), la base de datos se reinicia
    // cada vez que el servidor arranca. Asegúrate de reiniciar el servidor antes de ejecutar este script.
    console.log('Creating users...');
    for (const user of USERS_TO_ADD) {
      // Registrar el usuario
      const registerMutation = `
        mutation RegisterUser($name: String!, $email: String!, $password: String!) {
          registerUser(name: $name, email: $email, password: $password)
        }
      `;
      const registerData = await graphqlRequest(registerMutation, {
        name: user.name,
        email: user.email,
        password: user.password,
      });
      let token = registerData.registerUser;
      console.log(`User ${user.email} registered.`);

      // Verificar email para el admin
      if (user.role === 'admin') {
        const setRoleMutation = `
          mutation SetUserRole($email: String!, $role: String!) {
            _setUserRole(email: $email, role: $role)
          }
        `;
        await graphqlRequest(setRoleMutation, { email: user.email, role: 'admin' });
        console.log(`User ${user.email} role set to admin.`);

        const meQuery = `
          query Me {
            me {
              id
              verificationToken
            }
          }
        `;
        const meData = await graphqlRequest(meQuery, {}, token);
        if (meData.me && meData.me.verificationToken) {
          const verifyEmailMutation = `
            mutation VerifyEmail($token: String!) {
              verifyEmail(token: $token)
            }
          `;
          await graphqlRequest(verifyEmailMutation, { token: meData.me.verificationToken }, token);
          console.log(`Admin user ${user.email} verified.`);
        } else {
          console.warn(`Admin user ${user.email} registered but no verification token found.`);
        }
      }

      // Convertir a vendedor si es necesario y obtener un nuevo token
      if (user.role === 'seller') {
        const becomeSellerMutation = `
          mutation BecomeSeller {
            becomeSeller
          }
        `;
        // La mutación becomeSeller devuelve un nuevo token con el rol actualizado
        const becomeSellerData = await graphqlRequest(becomeSellerMutation, {}, token);
        token = becomeSellerData.becomeSeller; // Usar el nuevo token
        sellerTokens[user.email] = token;
        console.log(`User ${user.email} is now a seller.`);
      }
    }

    // Explicitly login admin to get a fresh token with admin privileges
    let adminToken = null;
    try {
      const loginMutation = `
        mutation LoginUser($email: String!, $password: String!) {
          loginUser(email: $email, password: $password)
        }
      `;
      const loginData = await graphqlRequest(loginMutation, { email: 'admin@example.com', password: 'adminpassword' });
      adminToken = loginData.loginUser;
      sellerTokens['admin@example.com'] = adminToken; // Update sellerTokens with the fresh admin token
      console.log('Admin user re-logged in to get fresh token.');
    } catch (e) {
      console.error('Failed to re-login admin user:', e.message);
      // If admin login fails, we can't proceed with category/store/product seeding
      throw new Error('Admin login failed, cannot proceed with seeding.');
    }

    // 2. Crear categorías
    console.log('Creating categories...');
    for (const cat of CATEGORIES_TO_ADD) {
      try {
        const createCategoryMutation = `
          mutation CreateCategory($name: String!) {
            createCategory(name: $name) {
              id
              name
            }
          }
        `;
        const categoryData = await graphqlRequest(createCategoryMutation, { name: cat.name }, sellerTokens['admin@example.com']);
        categoryMap[cat.name] = categoryData.createCategory.id;
        console.log(`Created category: ${cat.name}`);
      } catch (e) {
        if (e.message.includes('SQLITE_CONSTRAINT_UNIQUE')) {
          console.log(`Category ${cat.name} already exists. Fetching ID.`);
          const allCategoriesQuery = `
            query GetAllCategories {
              getAllCategories {
                id
                name
              }
            }
          `;
          const { getAllCategories } = await graphqlRequest(allCategoriesQuery);
          const existingCat = getAllCategories.find((c) => c.name === cat.name);
          if (existingCat) {
            categoryMap[cat.name] = existingCat.id;
          }
        } else {
          throw e;
        }
      }
    }

    // 3. Crear tiendas y sus productos
    console.log('Creating stores and products...');
    for (const storeData of STORES_AND_PRODUCTS) {
      const sellerToken = sellerTokens[storeData.sellerEmail];
      if (!sellerToken) {
        console.warn(
          `Seller token not found for ${storeData.sellerEmail}. Skipping store ${storeData.store.name}.`
        );
        continue;
      }

      let currentStoreId = null;

      // Intentar obtener la tienda si ya existe
      const meQuery = `
        query Me {
          me {
            id
            store {
              id
              name
            }
          }
        }
      `;
      const meData = await graphqlRequest(meQuery, {}, sellerToken);
      if (meData.me && meData.me.store) {
        currentStoreId = meData.me.store.id;
        console.log(
          `Seller ${storeData.sellerEmail} already owns store: ${meData.me.store.name} (ID: ${currentStoreId}). Skipping store creation.`
        );
      } else {
        // Crear la tienda
        const createStoreMutation = `
          mutation CreateStore($name: String!, $description: String!, $imageUrl: String) {
            createStore(name: $name, description: $description, imageUrl: $imageUrl) {
              id
              name
            }
          }
        `;
        const storeResponse = await graphqlRequest(
          createStoreMutation,
          storeData.store,
          sellerToken
        );
        currentStoreId = storeResponse.createStore.id;
        console.log(
          `Created store: ${storeData.store.name} (ID: ${currentStoreId}) for ${storeData.sellerEmail}.`
        );
      }

      // Añadir productos a la tienda
      for (const product of storeData.products) {
        const createProductMutation = `
          mutation CreateProduct($name: String!, $description: String!, $price: Float!, $storeId: ID!, $categoryId: ID!, $imageUrl: String, $stock: Int!) {
            createProduct(name: $name, description: $description, price: $price, storeId: $storeId, categoryId: $categoryId, imageUrl: $imageUrl, stock: $stock) {
              id
              name
            }
          }
        `;
        const categoryId = categoryMap[product.category];
        if (!categoryId) {
          console.warn(
            `Category ID not found for ${product.category}. Skipping product: ${product.name}`
          );
          continue;
        }
        try {
          await graphqlRequest(
            createProductMutation,
            {
              name: product.name,
              description: product.description,
              price: product.price,
              storeId: currentStoreId,
              categoryId: categoryId,
              imageUrl: product.imageUrl,
              stock: product.stock, // Añadido el campo stock
            },
            sellerToken
          );
          console.log(`  Added product: ${product.name} to ${storeData.store.name}.`);
        } catch (e) {
          console.warn(
            `  Failed to add product ${product.name} to ${storeData.store.name}: ${e.message}`
          );
        }
      }
    }

    console.log('Creating orders...');
    const allUsersQuery = `
      query AdminGetAllUsers {
        adminGetAllUsers {
          id
          email
          role
        }
      }
    `;
    const { adminGetAllUsers: allUsers } = await graphqlRequest(allUsersQuery, {}, sellerTokens['admin@example.com']); // Use admin token to get all users

    const allProductsQuery = `
      query AdminGetAllProducts {
        adminGetAllProducts {
          id
          name
          price
          store {
            id
          }
        }
      }
    `;
    const { adminGetAllProducts: allProducts } = await graphqlRequest(allProductsQuery, {}, sellerTokens['admin@example.com']); // Use admin token to get all products

    const createOrderMutation = `
      mutation CreateOrder($input: CreateOrderInput!) {
        createOrder(input: $input) {
          id
          totalAmount
          status
        }
      }
    `;

    const getRandomDate = (start, end) => {
      const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
      return date.toISOString();
    };

    const customers = allUsers.filter(user => user.role === 'customer');

    if (customers.length === 0) {
      console.warn('No customer users found to create orders for. Skipping order seeding.');
    } else if (allProducts.length === 0) {
      console.warn('No products found to create orders with. Skipping order seeding.');
    } else {
      for (const customer of customers) { // Iterate through each customer
        let customerToken = null;
        // Need to login customer to get their token
        const loginMutation = `
          mutation LoginUser($email: String!, $password: String!) {
            loginUser(email: $email, password: $password)
          }
        `;
        try {
          const loginData = await graphqlRequest(loginMutation, { email: customer.email, password: 'password123' }); // Assuming default password
          customerToken = loginData.loginUser;
        } catch (e) {
          console.warn(`Could not login customer ${customer.email} to fetch addresses. Skipping order creation for this customer.`);
          continue;
        }

        // Get customer's addresses
        const customerAddressesQuery = `
          query MyAddresses {
            myAddresses {
              id
              street
              city
            }
          }
        `;
        const { myAddresses: addresses } = await graphqlRequest(customerAddressesQuery, {}, customerToken);

        if (addresses.length === 0) {
          console.warn(`Customer ${customer.email} has no addresses. Skipping order creation for this customer.`);
          continue;
        }
        
        for (let i = 0; i < 10; i++) { // Create 10 orders per customer
          const deliveryAddress = addresses[Math.floor(Math.random() * addresses.length)];

          const orderProducts = [];
          const numProductsInOrder = Math.floor(Math.random() * 3) + 1; // 1 to 3 products per order

          const availableProducts = [...allProducts]; // Copy to avoid modifying original array

          for (let j = 0; j < numProductsInOrder; j++) {
            if (availableProducts.length === 0) break;

            const productIndex = Math.floor(Math.random() * availableProducts.length);
            const product = availableProducts[productIndex];
            availableProducts.splice(productIndex, 1); // Remove product to avoid duplicates in same order

            const quantity = Math.floor(Math.random() * 5) + 1; // 1 to 5 quantity
            orderProducts.push({
              productId: product.id,
              quantity: quantity,
              priceAtOrder: product.price, // Use current price
              product: product // Store product object for storeId access
            });
          }

          if (orderProducts.length === 0) {
            console.warn('No products selected for order. Skipping order.');
            continue;
          }

          // Ensure all products in the order belong to the same store
          const storeId = orderProducts[0].product.store.id; // Get store ID from the first product
          const itemsForOrder = orderProducts.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            priceAtOrder: item.priceAtOrder,
          }));

          const orderInput = {
            storeId: storeId,
            addressId: deliveryAddress.id,
            items: itemsForOrder,
          };

          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          const randomDate = getRandomDate(oneYearAgo, new Date());

          try {
            // Temporarily override fetch to set createdAt for the order
            const originalFetch = global.fetch;
            global.fetch = async (url, options) => {
              if (url === API_URL && options.body.includes('createOrder')) {
                const body = JSON.parse(options.body);
                body.variables.input.createdAt = randomDate; // Add createdAt to input
                options.body = JSON.stringify(body);
              }
              return originalFetch(url, options);
            };

            await graphqlRequest(createOrderMutation, { input: orderInput }, customerToken);
            console.log(`Created order for ${customer.email} on ${randomDate}.`);

            global.fetch = originalFetch; // Restore original fetch
          } catch (e) {
            console.error(`Failed to create order for ${customer.email}: ${e.message}`);
          }
        }
      }
    }

    console.log('Database seeding complete!');
  } catch (error) {
    console.error('Error during seeding:', error.message);
  }
}

seedDatabase();
