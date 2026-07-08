// =====================================================================
// 1. IMPORTACIONES MODULARES (Firebase v10)
// =====================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    initializeFirestore, persistentLocalCache, persistentMultipleTabManager, 
    collection, query, orderBy, limit, startAfter, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// =====================================================================
// 2. CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE
// =====================================================================
const firebaseConfig = {
    apiKey: "AIzaSyA9tUGGmMqk85Hljw8H1XoTfX2U5iQu85c",
    authDomain: "control-de-servicios-b8e34.firebaseapp.com",
    projectId: "control-de-servicios-b8e34",
    storageBucket: "control-de-servicios-b8e34.firebasestorage.app",
    messagingSenderId: "28935045448",
    appId: "1:28935045448:web:cf61d09b606951f000b37d",
    measurementId: "G-FSCT1H3VJJ"
};

// Inicializar la App
const app = initializeApp(firebaseConfig);

// Inicializar Firestore con la nueva caché local optimizada (Elimina el Warning anterior)
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

// Inicializar Autenticación
const auth = getAuth(app);


// =====================================================================
// 3. LÓGICA DE AUTENTICACIÓN (LOGIN / LOGOUT)
// =====================================================================
const loginContainer = document.getElementById('login-container');
const mainContent = document.getElementById('main-content');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-button');
const errorMessage = document.getElementById('error-message');

// Escuchar cambios de estado (Verifica si hay alguien logueado)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuario logueado: Ocultar login, mostrar portal y cargar datos
        console.log("Usuario autenticado:", user.email);
        if(loginContainer) loginContainer.style.display = 'none';
        if(mainContent) mainContent.style.display = 'block';
        
        cargarRequerimientos(); // Ahora sí tenemos permisos para leer
    } else {
        // Sin sesión: Mostrar login, ocultar portal
        console.log("Esperando inicio de sesión...");
        if(loginContainer) loginContainer.style.display = 'flex';
        if(mainContent) mainContent.style.display = 'none';
    }
});

// Evento para el Formulario de Acceso
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                if(errorMessage) errorMessage.innerText = '';
            })
            .catch((error) => {
                console.error("Error en login:", error);
                if(errorMessage) {
                    errorMessage.innerText = "Error: Credenciales incorrectas o usuario no encontrado.";
                    errorMessage.style.color = "#ff4d4d"; // Rojo suave para modo oscuro
                }
            });
    });
}

// Evento para Cerrar Sesión
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log("Sesión cerrada correctamente.");
            // Al cerrar, el onAuthStateChanged automáticamente lo mandará al Login
        }).catch((error) => {
            console.error("Error al cerrar sesión:", error);
        });
    });
}


// =====================================================================
// 4. MEJORA: DEBOUNCE Y BUSCADOR LOCAL
// =====================================================================
function debounce(func, espera) {
    let timeout;
    return function ejecutandoFuncion(...args) {
        const masTarde = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(masTarde, espera);
    };
}

const inputBusqueda = document.getElementById('filtro-busqueda');
if (inputBusqueda) {
    inputBusqueda.addEventListener('input', debounce((e) => {
        const termino = e.target.value.toLowerCase();
        const filas = document.querySelectorAll('#tabla-servicios tr');
        
        // Filtra visualmente la tabla sin volver a descargar datos de internet
        filas.forEach(fila => {
            const textoFila = fila.innerText.toLowerCase();
            if (textoFila.includes(termino)) {
                fila.style.display = '';
            } else {
                fila.style.display = 'none';
            }
        });
    }, 300));
}


// =====================================================================
// 5. CARGA Y RENDERIZADO DE DATOS (TABLA DE SERVICIOS)
// =====================================================================
let ultimoDocVisible = null;
let desuscribirCarga = null; // Variable para detener escuchas duplicadas

function renderizarTabla(listaRequerimientos) {
    const tbody = document.getElementById('tabla-servicios');
    if (!tbody) return;
    
    tbody.innerHTML = ''; 
    const fragmento = document.createDocumentFragment();

    listaRequerimientos.forEach(req => {
        const tr = document.createElement('tr');
        
        // Convertimos el estado en una clase válida (ej. "En Proceso" -> "en-proceso")
        const claseEstado = req.estado ? req.estado.toLowerCase().replace(/ /g, '-') : 'na';
        
        // Formateo de fecha seguro
        let fechaSolicitud = '';
        if (req.timestamp) {
            fechaSolicitud = typeof req.timestamp.toDate === 'function' 
                ? req.timestamp.toDate().toLocaleDateString() 
                : new Date(req.timestamp).toLocaleDateString();
        }

        tr.innerHTML = `
            <td>${req.numRequerimiento || ''}</td>
            <td>${req.numNV || ''}</td>
            <td class="cliente-cell">${req.cliente || ''}</td>
            <td>${req.direccion || ''}</td>
            <td>${req.tipoServicio || ''}</td>
            <td>${fechaSolicitud}</td>
            <td>${req.tieneRepuestos || ''}</td>
            <td>${req.repuestosDespachados || ''}</td>
            <td>${req.fechaAsignada || ''}</td>
            <td>${req.horaTraslado || ''}</td>
            <td>${req.horaInicio || ''}</td>
            <td>${req.horaTermino || ''}</td>
            <td>${(req.tecnicos || []).join(', ') || ''}</td>
            <td>
                <span class="status-badge badge-${claseEstado}">
                    ${req.estado || 'N/A'}
                </span>
            </td>
            <td class="action-cell">
                <button class="icon-btn" onclick="abrirModalServicio('${req.id}')">✏️ Editar</button>
            </td>
        `;
        
        fragmento.appendChild(tr);
    });

    tbody.appendChild(fragmento);
}

function cargarRequerimientos(paginaSiguiente = false) {
    const referencia = collection(db, "requerimientos");
    let consulta = query(referencia, orderBy("timestamp", "desc"), limit(50));

    if (paginaSiguiente && ultimoDocVisible) {
        consulta = query(referencia, orderBy("timestamp", "desc"), startAfter(ultimoDocVisible), limit(50));
    }

    // Si ya había una consulta en vivo, la detenemos para no duplicar datos
    if (desuscribirCarga) {
        desuscribirCarga();
    }

    // onSnapshot mantiene la tabla actualizada en tiempo real
    desuscribirCarga = onSnapshot(consulta, (snapshot) => {
        const datos = [];
        
        if (!snapshot.empty) {
            ultimoDocVisible = snapshot.docs[snapshot.docs.length - 1];
            snapshot.forEach((doc) => {
                datos.push({ id: doc.id, ...doc.data() });
            });
        }
        
        renderizarTabla(datos);
        
        const resultsInfo = document.getElementById('results-info');
        if(resultsInfo) resultsInfo.innerText = `Mostrando ${datos.length} servicios en esta página`;
        
    }, (error) => {
        console.error("Error al obtener los documentos:", error);
    });
}


// =====================================================================
// 6. CONTROL DE VENTANAS MODALES
// =====================================================================
// Exponer la función de abrir modal al entorno global para el botón "Editar"
window.abrirModalServicio = function(id) {
    console.log("Abrir detalles del requerimiento ID:", id);
    const modal = document.getElementById('service-modal');
    if(modal) {
        // Aquí deberás colocar tu lógica para rellenar los datos del modal usando el 'id'
        modal.style.display = 'flex';
    }
};

// Cerrar cualquier modal al hacer clic en la (X)
document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modalId = e.target.getAttribute('data-modal-id');
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    });
});
