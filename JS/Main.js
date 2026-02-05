// Datos del menú
const menuItems = [
    {
        id: 1,
        nombre: "Pasta Carbonara",
        descripcion: "Pasta fresca con panceta, huevo y queso parmesano",
        precio: 15.99,
        categoria: "Pasta",
        imagen: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=500"
    },
    {
        id: 2,
        nombre: "Filete Mignon",
        descripcion: "Corte premium de res con guarnición de vegetales asados",
        precio: 28.99,
        categoria: "Carnes",
        imagen: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=500"
    },
    {
        id: 3,
        nombre: "Salmón a la Plancha",
        descripcion: "Salmón fresco con salsa de limón y hierbas",
        precio: 22.99,
        categoria: "Pescados",
        imagen: "https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=500"
    },
    {
        id: 4,
        nombre: "Risotto de Hongos",
        descripcion: "Arroz cremoso con hongos portobello y trufa",
        precio: 18.99,
        categoria: "Pasta",
        imagen: "https://images.unsplash.com/photo-1476124369491-c2f3f8e0d49a?w=500"
    },
    {
        id: 5,
        nombre: "Pizza Margherita",
        descripcion: "Pizza artesanal con tomate, mozzarella y albahaca",
        precio: 14.99,
        categoria: "Pizzas",
        imagen: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500"
    },
    {
        id: 6,
        nombre: "Tiramisú",
        descripcion: "Postre italiano clásico con café y mascarpone",
        precio: 8.99,
        categoria: "Postres",
        imagen: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500"
    }
];

// Función para cargar el menú dinámicamente
function cargarMenu() {
    const menuContainer = document.getElementById('menuContainer');
    
    menuItems.forEach((item, index) => {
        const menuCard = `
            <div class="col-md-6 col-lg-4">
                <div class="card menu-card" style="animation-delay: ${index * 0.1}s">
                    <div class="position-relative">
                        <img src="${item.imagen}" class="card-img-top menu-card-img" alt="${item.nombre}">
                        <span class="menu-badge">${item.categoria}</span>
                    </div>
                    <div class="card-body menu-card-body">
                        <h5 class="card-title">${item.nombre}</h5>
                        <p class="card-text">${item.descripcion}</p>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <span class="menu-price">$${item.precio.toFixed(2)}</span>
                            <button class="btn btn-custom btn-sm" onclick="agregarAlPedido(${item.id})">
                                Ordenar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        menuContainer.innerHTML += menuCard;
    });
    
    // Agregar animación de entrada
    const cards = document.querySelectorAll('.menu-card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'all 0.5s ease';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 50);
        }, index * 100);
    });
}

// Función para agregar al pedido (simulada)
function agregarAlPedido(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    
    // Mostrar notificación
    mostrarNotificacion(`${item.nombre} agregado al pedido`, 'success');
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `alert alert-${tipo} position-fixed top-0 end-0 m-3`;
    notificacion.style.zIndex = '9999';
    notificacion.style.minWidth = '300px';
    notificacion.style.animation = 'slideInRight 0.5s ease';
    notificacion.innerHTML = `
        <strong>${tipo === 'success' ? '✓' : 'ℹ'}</strong> ${mensaje}
    `;
    
    document.body.appendChild(notificacion);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notificacion.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => {
            notificacion.remove();
        }, 500);
    }, 3000);
}

// Scroll suave para los enlaces del navbar
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // Cerrar el navbar en móviles
            const navbarCollapse = document.querySelector('.navbar-collapse');
            if (navbarCollapse.classList.contains('show')) {
                navbarCollapse.classList.remove('show');
            }
        }
    });
});

// Botón "Ver Menú"
document.getElementById('verMenuBtn').addEventListener('click', function() {
    document.getElementById('menu').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
});

// Formulario de contacto
document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Obtener valores del formulario
    const nombre = this.querySelector('input[type="text"]').value;
    const email = this.querySelector('input[type="email"]').value;
    const mensaje = this.querySelector('textarea').value;
    
    // Simulación de envío
    mostrarNotificacion('Mensaje enviado correctamente. Nos pondremos en contacto pronto.', 'success');
    
    // Limpiar formulario
    this.reset();
});

// Cambiar color del navbar al hacer scroll
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(26, 26, 26, 0.95)';
        navbar.style.backdropFilter = 'blur(10px)';
    } else {
        navbar.style.background = 'linear-gradient(135deg, var(--secondary-color) 0%, var(--dark-color) 100%)';
        navbar.style.backdropFilter = 'none';
    }
});

// Animaciones para elementos cuando entran en el viewport
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observar secciones
document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'all 0.8s ease';
        observer.observe(section);
    });
});

// Animaciones CSS adicionales
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Cargar el menú cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', cargarMenu);

// Efecto parallax suave en el hero
window.addEventListener('scroll', function() {
    const heroSection = document.querySelector('.hero-section');
    const scrolled = window.pageYOffset;
    
    if (heroSection) {
        heroSection.style.backgroundPositionY = scrolled * 0.5 + 'px';
    }
});

// Precarga de imágenes
window.addEventListener('load', function() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.5s ease';
        
        if (img.complete) {
            img.style.opacity = '1';
        } else {
            img.addEventListener('load', function() {
                img.style.opacity = '1';
            });
        }
    });
});