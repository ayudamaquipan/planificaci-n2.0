// app.js

// 1. IMPORTACIONES MODULARES (Reduce el peso del código cargado)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getFirestore, enableIndexedDbPersistence, collection, query, orderBy, limit, startAfter, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// 2. CONFIGURACIÓN FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyA9tUGGmMqk85Hljw8H1XoTfX2U5iQu85c",
  authDomain: "control-de-servicios-b8e34.firebaseapp.com",
  projectId: "control-de-servicios-b8e34",
  storageBucket: "control-de-servicios-b8e34.firebasestorage.app",
  messagingSenderId: "28935045448",
  appId: "1:28935045448:web:cf61d09b606951f000b37d",
  measurementId: "G-FSCT1H3VJJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 3. HABILITAR PERSISTENCIA OFFLINE (Caché local ultrarrápida)
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Múltiples pestañas abiertas, la persistencia offline funciona en una a la vez.');
    } else if (err.code == 'unimplemented') {
        console.warn('El navegador no soporta persistencia offline.');
    }
});

// 4. MEJORA: DEBOUNCE PARA EL BUSCADOR (Evita que el navegador se congele al teclear)
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

// Suponiendo que el ID de tu input de búsqueda es 'filtro-busqueda'
const inputBusqueda = document.getElementById('filtro-busqueda');
if (inputBusqueda) {
    inputBusqueda.addEventListener('input', debounce((e) => {
        // Tu lógica actual de filtrado de arreglos va aquí
        console.log("Filtrando tabla por:", e.target.value);
    }, 300)); // Espera 300ms después de que dejes de teclear
}

// 5. MEJORA: RENDERIZADO POR BLOQUES (DocumentFragment)
function renderizarTabla(listaRequerimientos) {
    const tbody = document.querySelector('table tbody');
    tbody.innerHTML = ''; 
    
    // Crear un fragmento en memoria
    const fragmento = document.createDocumentFragment();

    listaRequerimientos.forEach(req => {
        const tr = document.createElement('tr');
        
        // Pega aquí la lógica de tu tabla. Ejemplo básico:
        tr.innerHTML = `
            <td>${req.numRequerimiento || ''}</td>
            <td class="cliente-cell">${req.cliente || ''}</td>
            <td>
                <span class="status-badge badge-${req.estado ? req.estado.toLowerCase().replace(/ /g, '-') : 'na'}">
                    ${req.estado || 'N/A'}
                </span>
            </td>
            `;
        
        fragmento.appendChild(tr);
    });

    // Inyecta las 50 filas de un solo golpe, evitando 50 repintados de pantalla
    tbody.appendChild(fragmento);
}

// 6. MEJORA: PAGINACIÓN DESDE EL SERVIDOR DE FIREBASE
let ultimoDocVisible = null;

function cargarRequerimientos(paginaSiguiente = false) {
    let referencia = collection(db, "requerimientos");
    // Traemos solo los últimos 50 registros para carga inmediata
    let consulta = query(referencia, orderBy("timestamp", "desc"), limit(50));

    // Si presionas el botón "Siguiente", carga los siguientes 50
    if (paginaSiguiente && ultimoDocVisible) {
        consulta = query(referencia, orderBy("timestamp", "desc"), startAfter(ultimoDocVisible), limit(50));
    }

    onSnapshot(consulta, (snapshot) => {
        const datos = [];
        // Guardamos el último documento de esta tanda para usarlo de punto de partida en la página siguiente
        ultimoDocVisible = snapshot.docs[snapshot.docs.length - 1];
        
        snapshot.forEach((doc) => {
            datos.push({ id: doc.id, ...doc.data() });
        });
        
        renderizarTabla(datos);
    });
}

// Iniciar la plataforma
// ELIMINA O COMENTA ESTA LÍNEA:
// cargarRequerimientos();

// AGREGAR ESTE BLOQUE:
// Escuchar cambios en la autenticación del usuario
onAuthStateChanged(auth, (user) => {
    if (user) {
        // El usuario inició sesión correctamente
        console.log("Usuario autenticado:", user.email);
        
        // 1. Ocultar el login y mostrar el panel de control
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        
        // 2. AHORA SÍ, cargar los datos porque ya tenemos permiso
        cargarRequerimientos();
    } else {
        // No hay usuario logueado o cerró sesión
        console.log("Esperando inicio de sesión...");
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('main-content').style.display = 'none';
    }
});
