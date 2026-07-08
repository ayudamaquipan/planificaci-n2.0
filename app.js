// =====================================================================
// 1. IMPORTACIONES MODULARES (Firebase v10)
// =====================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    initializeFirestore, persistentLocalCache, persistentMultipleTabManager, 
    collection, query, orderBy, limit, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// =====================================================================
// 2. CONFIGURACIÓN FIREBASE
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

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
const auth = getAuth(app);

// Variables globales para los datos
let todosLosRequerimientos = [];

// =====================================================================
// 3. AUTENTICACIÓN
// =====================================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        cargarRequerimientos();
    } else {
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('main-content').style.display = 'none';
    }
});

document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, email, password).catch(error => {
        const errorMsg = document.getElementById('error-message');
        if(errorMsg) {
            errorMsg.innerText = "Error: Credenciales incorrectas.";
            errorMsg.style.color = "#ff4d4d";
        }
    });
});

document.getElementById('logout-button')?.addEventListener('click', () => signOut(auth));

// =====================================================================
// 4. INTERFAZ: MODO OSCURO Y MODALES
// =====================================================================
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('change', (e) => {
        document.documentElement.setAttribute('data-theme', e.target.checked ? 'light' : 'dark');
    });
}

// Cerrar Modales
document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modalId = e.target.getAttribute('data-modal-id');
        document.getElementById(modalId).style.display = 'none';
    });
});

// Abrir Modal Masivo
document.getElementById('abrir-modal-masivo')?.addEventListener('click', () => {
    document.getElementById('bulk-add-modal').style.display = 'flex';
});

// =====================================================================
// 5. CARGA DE DATOS Y RENDERIZADO DE LA TABLA
// =====================================================================
function cargarRequerimientos() {
    // ⚠️ REVISA ESTO: Si en tu Firebase la colección se llama distinto, 
    // cambia la palabra "requerimientos" por el nombre real.
    const referencia = collection(db, "servicios");
    
    // Quitamos el orderBy("timestamp") para evitar que Firestore esconda 
    // los registros que no tienen fecha.
    const consulta = query(referencia, limit(100));

    console.log("⏳ Solicitando datos a Firebase...");

    onSnapshot(consulta, (snapshot) => {
        console.log("✅ Datos recibidos. Cantidad de servicios encontrados:", snapshot.size);
        
        todosLosRequerimientos = [];
        snapshot.forEach((doc) => {
            todosLosRequerimientos.push({ id: doc.id, ...doc.data() });
        });
        
        renderizarTabla(todosLosRequerimientos);
        actualizarListasDesplegables(todosLosRequerimientos);
        
    }, (error) => {
        console.error("❌ Error al obtener datos:", error);
    });
}
// =====================================================================
// 6. SISTEMA DE FILTROS DINÁMICOS
// =====================================================================
function actualizarListasDesplegables(lista) {
    const llenarSelect = (idSelect, campo) => {
        const select = document.getElementById(idSelect);
        if (!select) return;
        
        // Obtener valores únicos
        const valoresUnicos = [...new Set(lista.map(req => req[campo]).filter(Boolean))].sort();
        
        // Mantener la primera opción "Todos"
        select.innerHTML = '<option value="todos">Todos</option>';
        
        valoresUnicos.forEach(valor => {
            const option = document.createElement('option');
            option.value = valor;
            option.textContent = valor;
            select.appendChild(option);
        });
    };

    llenarSelect('filtro-estado', 'estado');
    llenarSelect('filtro-vendedor', 'vendedor');
    llenarSelect('filtro-tipo-servicio', 'tipoServicio');
}

function aplicarFiltros() {
    const textoBusqueda = document.getElementById('filtro-busqueda')?.value.toLowerCase() || '';
    const estado = document.getElementById('filtro-estado')?.value || 'todos';
    const vendedor = document.getElementById('filtro-vendedor')?.value || 'todos';
    const tipoServicio = document.getElementById('filtro-tipo-servicio')?.value || 'todos';

    const resultados = todosLosRequerimientos.filter(req => {
        const coincideBusqueda = Object.values(req).some(val => 
            String(val).toLowerCase().includes(textoBusqueda)
        );
        const coincideEstado = estado === 'todos' || req.estado === estado;
        const coincideVendedor = vendedor === 'todos' || req.vendedor === vendedor;
        const coincideTipo = tipoServicio === 'todos' || req.tipoServicio === tipoServicio;

        return coincideBusqueda && coincideEstado && coincideVendedor && coincideTipo;
    });

    renderizarTabla(resultados);
}

// Escuchar cambios en los filtros
['filtro-busqueda', 'filtro-estado', 'filtro-vendedor', 'filtro-tipo-servicio'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', aplicarFiltros);
});
