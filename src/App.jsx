import { useEffect, useMemo, useState } from 'react'
import './App.css'
import logo from './assets/logo.jpg'
import station1 from './assets/products/station-1.jpg'
import station2 from './assets/products/station-2.jpg'
import case1 from './assets/products/case-1.jpg'
import case2 from './assets/products/case-2.jpg'
import case3 from './assets/products/case-3.jpg'
import powerbank1 from './assets/products/powerbank-1.jpg'
import powerbank2 from './assets/products/powerbank-2.jpg'
import powerbank3 from './assets/products/powerbank-3.jpg'

const categories = [
  'Все',
  'Чехлы',
  'Кабели',
  'Блоки питания',
  'Станции 3 в 1',
  'Повербанки',
  'Кархолдеры',
  'SSD',
  'Штативы',
]

const products = [
  {
    id: 1,
    category: 'Станции 3 в 1',
    badge: 'Новинка',
    name: 'Зарядная станция 3 в 1 Magssory Signature Disc Pro для Apple Qi2 Midnight',
    price: 21990,
    images: [station1, station2],
    features: [
      'Эксклюзивный комплект в подарочной упаковке из премиальной экокожи',
      'Зарядка 3 устройств Apple одновременно',
      'Быстрая беспроводная зарядка 25 Вт',
      'Полная совместимость: MagSafe, Qi2, Qi, PD, QC',
      'Надёжное магнитное крепление и регулируемый угол наклона',
      'Элегантный складной корпус',
    ],
  },
  {
    id: 2,
    category: 'Чехлы',
    badge: 'Премиум',
    name: 'Magssory Aramid Frame Case for iPhone 17 Pro Max Pixel Blue',
    price: 7990,
    images: [case1, case2, case3],
    features: [
      'Кевларовый чехол, максимальная стойкость к ударам',
      'Внутренняя микрониша для стикера банковской карты',
      'Ультратонкий профиль, повторяет изгибы устройства',
      'Шероховатая текстура карбона, матовая поверхность без следов',
      'Полная совместимость с MagSafe, магниты N52',
    ],
  },
  {
    id: 3,
    category: 'Повербанки',
    badge: 'Qi2',
    name: 'Беспроводной внешний аккумулятор Magssory Pride 10000 мАч с поддержкой Qi2',
    price: 11990,
    images: [powerbank1, powerbank2, powerbank3],
    features: [
      'Тонкий корпус из алюминиевого сплава, литьевого силикона и арамида',
      'Стандарт зарядки Qi2',
      'Ёмкость 10000 мАч',
      'Совместимость с MagSafe',
      'Магниты с обратной стороны корпуса для крепления кошельков с MagSafe',
      'Беспроводная зарядка 15 Вт с магнитным креплением класса N52',
      'Порт Type-C и поддержка сквозной зарядки',
      'Индикация заряда диодами',
      'Покрытие Soft-touch',
    ],
  },
]

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

  useEffect(() => {
    if (!telegram) {
      return
    }

    telegram.ready()
    telegram.expand()

    const user = telegram.initDataUnsafe?.user
    if (user) {
      setTelegramUser(user)
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
  }, [search, activeCategory, showFavorites, favorites])

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
  }, [cart])

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

  function checkoutInTelegram() {
    if (cartItems.length === 0) {
      return
    }

    const lines = [
      'Здравствуйте!',
      '',
      'Хочу оформить заказ:',
      '',
    ]

    cartItems.forEach(({ product, quantity }, index) => {
      lines.push(`${index + 1}. ${product.name}`)
      lines.push(`Количество: ${quantity}`)
      lines.push(
        `Сумма: ${money(product.price * quantity)}`,
      )
      lines.push('')
    })

    lines.push(`Итого: ${money(cartTotal)}`)

    const message = encodeURIComponent(lines.join('\n'))

    const url =
      `https://t.me/new_yaapple?text=${message}`

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

          {filteredProducts.length === 0 && (
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
                  onClick={checkoutInTelegram}
                >
                  Оформить заказ в Telegram
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
