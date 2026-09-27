import 'server-only';
import {Pool,types,type PoolClient} from 'pg';

// PostgreSQL SUM(integer) returns bigint. Keep API money values numeric.
types.setTypeParser(20,value=>{const n=Number(value);if(!Number.isSafeInteger(n))throw new Error('Record total exceeds the supported range.');return n;});
let pool:Pool|undefined;
function connection(){if(!process.env.DATABASE_URL)throw new Error('Database connection is not configured.');return pool??=new Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:5000,connectionTimeoutMillis:10000,allowExitOnIdle:true,ssl:process.env.DATABASE_SSL==='disable'?false:{rejectUnauthorized:true}});}
export type Result={results:any[],meta:{changes:number}};
export class Statement{
  private args:any[]=[];
  constructor(readonly sql:string){}
  bind(...args:unknown[]){this.args=args;return this;}
  async execute(client?:PoolClient):Promise<Result>{const r=await (client||connection()).query(this.sql,this.args);return {results:r.rows,meta:{changes:r.rowCount||0}};}
  async first<T=any>():Promise<T|null>{return (await this.execute()).results[0]||null;}
  async all(){return this.execute();}
  async run(){return this.execute();}
}
export const database={prepare:(sql:string)=>new Statement(sql),async batch(statements:Statement[]){const client=await connection().connect();try{await client.query('BEGIN');const results=[];for(const statement of statements)results.push(await statement.execute(client));await client.query('COMMIT');return results;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}};
