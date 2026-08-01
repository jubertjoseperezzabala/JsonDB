import { JsonDB } from '../../src/JsonDB.js';

interface SchoolSchema {
    users: any[];
    courses: any[];
    enrollments: any[];
}

const repo = new JsonDB.JsonRepository<SchoolSchema>();

(async () => {
    try {
        console.log("--- ⚡ JsonDB Demostracion ---");
        
        repo.createDataBase('SchoolSystem', true);

        await repo.createTable('users');
        await repo.createTable('courses');
        await repo.createTable('enrollments');

        await repo.insert('users', { name: 'Jubert', email: 'jubert@fluxer.io' });
        await repo.update('users', 1, { name: 'Jubert (Admin)' });
        
        await repo.insert('courses', { title: 'JS Master', teacherId: 1 });
        await repo.insert('enrollments', { userId: 1, courseId: 1 });

        const result = repo.innerJoin('enrollments', [
            { table: 'users', foreignKey: 'userId', as: 'alumno' }
        ]);

        console.dir(result, { depth: null });

        await repo.deleteRecord('enrollments', 1);

    } 
    catch (e: any) {
        console.error("❌ Error:", e.message);
    }
})();
