import { JsonDB } from '../../src/JsonDB.js';
// 1. Instanciamos el repositorio sin nombre en el constructor
const inventoryRepo = new JsonDB.JsonRepository();
console.log("--- 📦 Fluxer: Gestión de Inventario (3 Tablas) ---");
try {
    // 2. Inicializamos una nueva base de datos llamada 'Warehouse'
    inventoryRepo.createDataBase('Warehouse', true);
    // 3. Definimos la estructura de las 3 tablas
    inventoryRepo.createTable('categories');
    inventoryRepo.createTable('suppliers');
    inventoryRepo.createTable('products');
    // 4. Insertamos Datos Maestros
    console.log("-> Insertando categorías y proveedores...");
    inventoryRepo.insert('categories', { name: 'Electrónica' }); // ID 1
    inventoryRepo.insert('suppliers', { name: 'TechCorp International', country: 'Japón' }); // ID 1
    // 5. Insertamos Producto relacionado a las dos tablas anteriores
    console.log("-> Registrando productos...");
    inventoryRepo.insert('products', {
        name: 'Laptop Gamer X',
        price: 1500,
        categoryId: 1,
        supplierId: 1
    });
    // 6. Ejecución del InnerJoin de 3 tablas
    // Cruzamos 'products' con sus categorías y sus proveedores
    console.log("\n🔍 Consultando stock con relaciones completas:");
    const inventoryReport = inventoryRepo.innerJoin('products', [
        {
            table: 'categories',
            foreignKey: 'categoryId',
            as: 'categoria'
        },
        {
            table: 'suppliers',
            foreignKey: 'supplierId',
            as: 'proveedor'
        }
    ]);
    // 7. Resultado por consola
    console.dir(inventoryReport, { depth: null });
}
catch (error) {
    console.error("❌ Error en el Inventario:", error.message);
}
console.log("\n--- ✅ Fin del ejemplo de Inventario ---");
