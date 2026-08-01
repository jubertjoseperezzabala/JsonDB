import { JsonDB } from '../../src/JsonDB.js';

interface InventorySchema {
    categories: any[];
    suppliers: any[];
    products: any[];
}

const inventoryRepo = new JsonDB.JsonRepository<InventorySchema>();

(async () => {
    console.log("--- 📦 Fluxer: Gestión de Inventario (3 Tablas) ---");

    try {
        await inventoryRepo.createDataBase('Warehouse', true);

        await inventoryRepo.createTable('categories');
        await inventoryRepo.createTable('suppliers');
        await inventoryRepo.createTable('products');

        console.log("-> Insertando categorías y proveedores...");
        await inventoryRepo.insert('categories', { name: 'Electrónica' });
        await inventoryRepo.insert('suppliers', { name: 'TechCorp International', country: 'Japón' });

        console.log("-> Registrando productos...");
        await inventoryRepo.insert('products', { 
            name: 'Laptop Gamer X', 
            price: 1500, 
            categoryId: 1, 
            supplierId: 1 
        });

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

        console.dir(inventoryReport, { depth: null });

    } catch (error: any) {
        console.error("❌ Error en el Inventario:", error.message);
    }

    console.log("\n--- ✅ Fin del ejemplo de Inventario ---");
})();
