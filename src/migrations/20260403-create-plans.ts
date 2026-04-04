import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlans20260403 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "plans" (
        "id" varchar(50) PRIMARY KEY,
        "name" varchar(100) NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "active" boolean DEFAULT true,
        "meta" jsonb DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);

    await queryRunner.query(`
      INSERT INTO "plans" ("id","name","price","active","meta") VALUES
        ('protegido','Plan Protegido',29.90,true,'{}'),
        ('familia','Plan Familia',49.90,true,'{}'),
        ('free','Gratis',0.00,true,'{}');
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_plans_updated_at
      BEFORE UPDATE ON "plans"
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_plans_updated_at ON "plans";`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_updated_at_column();`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "plans";`);
  }
}
