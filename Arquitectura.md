JsonDB:

Es un manejador de bases de datos no relacional con un esquema abierto, utiliza 
TypeScript para el manejo de tipos, y maneja un esque indexado para el acceso a
tablas.


Basado en capas:

1. Capa de Infraestructura (El Motor)
Aquí es donde vive la lógica de Node.js pura.

Responsabilidad: Leer y escribir strings en el sistema de archivos. No sabe qué hay dentro del JSON, solo sabe que es un 
archivo.

Regla 1: Aquí se aplica el nombre del archivo basado en la clase.

2. Capa de Abstracción de Datos (El Repositorio)
Esta es una clase genérica que actúa como intermediaria.

Responsabilidad: Convertir el texto JSON en objetos de TypeScript (POJOs) y viceversa. Aquí es donde implementamos los 
métodos CRUD básicos (Crear, Leer, Actualizar, Borrar) de forma genérica.

3. Capa de Componentes (La Lógica de Negocio)
Aquí es donde tú creas clases específicas para cada necesidad (Usuarios, Facturas, Productos).

Responsabilidad: Filtrar datos, validar que un email sea correcto antes de guardar, o relacionar un componente con otro.

***********************************************************************************************************************

La jerarquía sería:

Base de Datos (Archivo JSON): El nombre de la clase/archivo.

Tablas (Propiedades del JSON): Claves dinámicas dentro de ese archivo.

Documentos (Registros): Los arrays de objetos dentro de cada propiedad.

Ej:

Para una BD llamada Sistema escolar, tendriamos:
{
  "usuarios": [ { "id": 1, "nombre": "Jubert" } ],
  "cursos": [ { "id": 101, "titulo": "NodeJS Pro" } ],
  "configuracion": { "tema": "dark" }
}

***************************************************************************************
FileEngine: Clase Base, Motor de bajo nivel para la manipulación de archivos físicos.
 se encarga exclusivamente de la persistencia de strings en el disco.

 JsonRepository: Clase genérica que gestiona la transformación de datos (POJOs) 
 y la lógica de indexación por tablas.

 JsonDB: Fachada principal de la libreria JsonDB. Centraliza el acceso al motor de archivos y 
 al repositorio genérico.

 **************************************************************************************

 Dependencias:

npm install -g pnpm
pnpm install
pnpm add -D typescript ts-node @types/node

***************************************************************************************

Flujo:

FileEngine.ts: Gestiona la persistencia física en la carpeta /data.

JsonRepository.ts: Provee los métodos find, findAll, insert y update.

JsonDB.ts: Actúa como la fachada (Facade) que centraliza el acceso.

SchoolManager.ts: Representa la capa de componentes donde aplicas la lógica de negocio, 
como validar correos duplicados antes de insertar.

La documentacion completa puedes verla en:
https://jubertjoseperezzabala.github.io/JsonDB/