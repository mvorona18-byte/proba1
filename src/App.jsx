import { useEffect, useMemo, useState } from 'react'
import './App.css'
import logo from './assets/logo.jpg'

const API_BASE = 'https://api.yaapple.ru'

function normalizeProduct(product) {
  const images = Array.isArray(product.images)
    ? product.images
        .map((image) => image?.url || image?.path || image)
        .filter(Boolean)
        .map((url) =>
          url.startsWith('http') ? url : `${API_BASE}${url}`,
        )
    : []

  const description = String(product.description || '').trim()
  const features = description
    ? description
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    : ['Описание скоро появится.']

  return {
    id: Number(product.id),
    category: product.category_name || 'Без категории',
    badge: product.badge || (product.is_featured ? 'Рекомендуем' : 'Новинка'),
    name: product.name || 'Без названия',
    price: Number(product.price) || 0,
    oldPrice: product.old_price ? Number(product.old_price) : null,
    stock: Number(product.stock) || 0,
    images: images.length ? images : [logo],
    features,
  }
}

const money = (value) => `${value.toLocaleString('ru-RU')} ₽`
const telegram = window.Telegram?.WebApp

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

function App() {
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Все')
  const [cart, setCart] = useState(() =>
    readStorage('yablochniy-cart', {}),
  )
  const [favorites, setFavorites] = useState(() =>
    readStorage('yablochniy-favorites', []),
  )
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [cartOpen, setCartOpen] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [telegramUser, setTelegramUser] = useState(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerComment, setCustomerComment] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadProducts() {
      try {
        setProductsLoading(true)
        setProductsError('')

        const response = await fetch(`${API_BASE}/api/products`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })

        if (!response.ok) {
          throw new Error(`Ошибка загрузки: ${response.status}`)
        }

        const data = await response.json()
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.products)
            ? data.products
            : []

        setProducts(
          list
            .filter((product) => product.is_active !== 0)
            .map(normalizeProduct),
        )
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error(error)
          setProductsError('Не удалось загрузить товары. Попробуйте обновить страницу.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setProductsLoading(false)
        }
      }
    }

    loadProducts()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!telegram) {
      return
    }

    telegram.ready()
    telegram.expand()

    const user = telegram.initDataUnsafe?.user
    if (user) {
      setTelegramUser(user)
      setCustomerName(
        [user.first_name, user.last_name]
          .filter(Boolean)
          .join(' '),
      )
    }

    try {
      telegram.setHeaderColor('#ffffff')
      telegram.setBackgroundColor('#ffffff')
    } catch {
      // Старые клиенты Telegram могут не поддерживать эти методы.
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      'yablochniy-cart',
      JSON.stringify(cart),
    )
  }, [cart])

  useEffect(() => {
    localStorage.setItem(
      'yablochniy-favorites',
      JSON.stringify(favorites),
    )
  }, [favorites])

  const categories = useMemo(() => {
    const productCategories = products
      .map((product) => product.category)
      .filter(Boolean)

    return ['Все', ...new Set(productCategories)]
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(search.toLowerCase())

      const matchesCategory =
        activeCategory === 'Все' ||
        product.category === activeCategory

      const matchesFavorites =
        !showFavorites || favorites.includes(product.id)

      return (
        matchesSearch &&
        matchesCategory &&
        matchesFavorites
      )
    })
  }, [products, search, activeCategory, showFavorites, favorites])

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = products.find(
          (item) => item.id === Number(productId),
        )

        return {
          product,
          quantity,
        }
      })
      .filter((item) => item.product && item.quantity > 0)
  }, [cart, products])

  const cartCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  )

  const cartTotal = cartItems.reduce(
    (total, item) =>
      total + item.product.price * item.quantity,
    0,
  )

  function haptic(type = 'light') {
    telegram?.HapticFeedback?.impactOccurred(type)
  }

  function toggleFavorite(productId) {
    setFavorites((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    )

    haptic()
  }

  function addToCart(product) {
    setCart((currentCart) => ({
      ...currentCart,
      [product.id]: (currentCart[product.id] || 0) + 1,
    }))

    haptic()
  }

  function changeQuantity(productId, difference) {
    setCart((currentCart) => {
      const nextQuantity =
        (currentCart[productId] || 0) + difference

      const nextCart = { ...currentCart }

      if (nextQuantity <= 0) {
        delete nextCart[productId]
      } else {
        nextCart[productId] = nextQuantity
      }

      return nextCart
    })
  }

  function removeFromCart(productId) {
    setCart((currentCart) => {
      const nextCart = { ...currentCart }
      delete nextCart[productId]
      return nextCart
    })
  }

  function openProduct(product) {
    setSelectedProduct(product)
    setSelectedImage(0)
  }

  function openCheckout() {
    if (cartItems.length === 0) return
    setCartOpen(false)
    setCheckoutOpen(true)
  }

  function checkoutInTelegram() {
    if (!customerName.trim() || !customerPhone.trim()) {
      telegram?.showAlert?.(
        'Заполните имя и номер телефона.',
      )
      return
    }

    const lines = [
      'Новый заказ из Mini App',
      '',
      `Имя: ${customerName.trim()}`,
      `Телефон: ${customerPhone.trim()}`,
    ]

    if (telegramUser?.username) {
      lines.push(`Telegram: @${telegramUser.username}`)
    }

    if (customerComment.trim()) {
      lines.push(`Комментарий: ${customerComment.trim()}`)
    }

    lines.push('', 'Товары:')

    cartItems.forEach(({ product, quantity }, index) => {
      lines.push(`${index + 1}. ${product.name}`)
      lines.push(`Количество: ${quantity}`)
      lines.push(`Сумма: ${money(product.price * quantity)}`, '')
    })

    lines.push(`Итого: ${money(cartTotal)}`)

    const url =
      `https://t.me/new_yaapple?text=` +
      encodeURIComponent(lines.join('\n'))

    if (telegram?.openTelegramLink) {
      telegram.openTelegramLink(url)
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <img
            src={logo}
            alt="Логотип Яблочный"
            className="logo"
          />

          <div>
            <h1>ЯБЛОЧНЫЙ</h1>
            <p>Магазин &amp; Сервис</p>

            {telegramUser?.first_name && (
              <span className="telegram-user">
                Привет, {telegramUser.first_name} 👋
              </span>
            )}
          </div>
        </div>

        <button
          className="cart-button"
          onClick={() => setCartOpen(true)}
        >
          Корзина
          <span>{cartCount}</span>
        </button>
      </header>

      <main>
        <section className="hero">
          <p className="hero-label">
            Аксессуары для Apple
          </p>

          <h2>
            Технологии, которые дополняют ваш iPhone
          </h2>

          <p className="hero-description">
            Премиальные аксессуары MagSafe, Qi2 и USB‑C.
          </p>
        </section>

        <div className="search">
          <input
            type="search"
            placeholder="Поиск товаров..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <div className="view-buttons">
          <button
            className={!showFavorites ? 'view-button active' : 'view-button'}
            onClick={() => setShowFavorites(false)}
          >
            Все товары
          </button>

          <button
            className={showFavorites ? 'view-button active' : 'view-button'}
            onClick={() => setShowFavorites(true)}
          >
            Избранное · {favorites.length}
          </button>
        </div>

        <section>
          <h2 className="section-title">Категории</h2>

          <div className="categories">
            {categories.map((category) => (
              <button
                key={category}
                className={
                  activeCategory === category
                    ? 'category active'
                    : 'category'
                }
                onClick={() =>
                  setActiveCategory(category)
                }
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="section-line">
            <h2 className="section-title">
              {showFavorites ? 'Избранное' : 'Товары'}
            </h2>
            <span>{filteredProducts.length} шт.</span>
          </div>

          {productsLoading && (
            <p className="empty-message">Загружаем товары…</p>
          )}

          {productsError && (
            <p className="empty-message">{productsError}</p>
          )}

          <div className="products">
            {filteredProducts.map((product) => (
              <article
                className="product-card"
                key={product.id}
              >
                <button
                  className="product-image"
                  onClick={() => openProduct(product)}
                >
                  <span className="badge">
                    {product.badge}
                  </span>

                  <img
                    src={product.images[0]}
                    alt={product.name}
                  />
                </button>

                <button
                  className={
                    favorites.includes(product.id)
                      ? 'favorite-button active'
                      : 'favorite-button'
                  }
                  onClick={() => toggleFavorite(product.id)}
                  aria-label="Добавить в избранное"
                >
                  {favorites.includes(product.id) ? '♥' : '♡'}
                </button>

                <p className="product-category">
                  {product.category}
                </p>

                <h3>{product.name}</h3>

                <strong className="product-price">
                  {money(product.price)}
                </strong>

                <div className="product-actions">
                  <button
                    className="details-button"
                    onClick={() => openProduct(product)}
                  >
                    Подробнее
                  </button>

                  <button
                    className="add-button"
                    onClick={() => addToCart(product)}
                  >
                    В корзину
                  </button>
                </div>
              </article>
            ))}
          </div>

          {!productsLoading && !productsError && filteredProducts.length === 0 && (
            <p className="empty-message">
              Здесь пока ничего нет.
            </p>
          )}
        </section>

        <section className="manager">
          <div>
            <h2>Нужна помощь?</h2>
            <p>
              Напишите нашему менеджеру в Telegram
            </p>
          </div>

          <a
            href="https://t.me/new_yaapple"
            target="_blank"
            rel="noreferrer"
          >
            Написать менеджеру
          </a>
        </section>
      </main>

      {selectedProduct && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="close-button"
              onClick={() => setSelectedProduct(null)}
            >
              ×
            </button>

            <img
              className="modal-main-image"
              src={
                selectedProduct.images[selectedImage]
              }
              alt={selectedProduct.name}
            />

            <div className="thumbnails">
              {selectedProduct.images.map(
                (image, index) => (
                  <button
                    key={image}
                    className={
                      selectedImage === index
                        ? 'thumbnail active'
                        : 'thumbnail'
                    }
                    onClick={() =>
                      setSelectedImage(index)
                    }
                  >
                    <img src={image} alt="" />
                  </button>
                ),
              )}
            </div>

            <p className="product-category">
              {selectedProduct.category}
            </p>

            <h2>{selectedProduct.name}</h2>

            <strong className="modal-price">
              {money(selectedProduct.price)}
            </strong>

            <ul>
              {selectedProduct.features.map(
                (feature) => (
                  <li key={feature}>{feature}</li>
                ),
              )}
            </ul>

            <button
              className="add-button wide"
              onClick={() =>
                addToCart(selectedProduct)
              }
            >
              Добавить в корзину
            </button>
          </div>
        </div>
      )}

      {cartOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="modal cart-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="close-button"
              onClick={() => setCartOpen(false)}
            >
              ×
            </button>

            <h2>Корзина</h2>

            {cartItems.length === 0 ? (
              <p className="empty-cart">
                Корзина пока пустая.
              </p>
            ) : (
              <>
                <div className="cart-list">
                  {cartItems.map(
                    ({ product, quantity }) => (
                      <article
                        className="cart-item"
                        key={product.id}
                      >
                        <img
                          src={product.images[0]}
                          alt={product.name}
                        />

                        <div className="cart-item-info">
                          <h3>{product.name}</h3>
                          <strong>
                            {money(product.price)}
                          </strong>

                          <div className="quantity">
                            <button
                              onClick={() =>
                                changeQuantity(
                                  product.id,
                                  -1,
                                )
                              }
                            >
                              −
                            </button>

                            <span>{quantity}</span>

                            <button
                              onClick={() =>
                                changeQuantity(
                                  product.id,
                                  1,
                                )
                              }
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          className="remove-button"
                          onClick={() =>
                            removeFromCart(product.id)
                          }
                        >
                          Удалить
                        </button>
                      </article>
                    ),
                  )}
                </div>

                <div className="cart-total">
                  <span>Итого</span>
                  <strong>{money(cartTotal)}</strong>
                </div>

                <button
                  className="add-button wide"
                  onClick={openCheckout}
                >
                  Перейти к оформлению
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {checkoutOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setCheckoutOpen(false)}
        >
          <div
            className="modal checkout-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="close-button"
              onClick={() => setCheckoutOpen(false)}
            >
              ×
            </button>

            <h2>Оформление заказа</h2>

            <p className="checkout-description">
              Заполните контактные данные.
            </p>

            <label className="checkout-field">
              <span>Имя</span>
              <input
                value={customerName}
                onChange={(event) =>
                  setCustomerName(event.target.value)
                }
                placeholder="Как к вам обращаться?"
              />
            </label>

            <label className="checkout-field">
              <span>Телефон</span>
              <input
                type="tel"
                value={customerPhone}
                onChange={(event) =>
                  setCustomerPhone(event.target.value)
                }
                placeholder="+7 999 000-00-00"
              />
            </label>

            <label className="checkout-field">
              <span>Комментарий</span>
              <textarea
                value={customerComment}
                onChange={(event) =>
                  setCustomerComment(event.target.value)
                }
                placeholder="Цвет, модель устройства, пожелания..."
                rows="4"
              />
            </label>

            <div className="checkout-summary">
              <span>Товаров: {cartCount}</span>
              <strong>{money(cartTotal)}</strong>
            </div>

            <button
              className="add-button wide"
              onClick={checkoutInTelegram}
            >
              Отправить заказ менеджеру
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
