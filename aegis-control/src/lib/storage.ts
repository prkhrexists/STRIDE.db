import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || './data';

export const storage = {
  getFlightsDir: () => path.join(DATA_DIR, 'flights'),
  getModelsDir: () => path.join(DATA_DIR, 'models'),
  getReportsDir: () => path.join(DATA_DIR, 'reports'),

  async saveFlightData(flightId: string, data: any) {
    const dir = path.join(this.getFlightsDir(), flightId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, 'flight_data.json'),
      JSON.stringify(data, null, 2)
    );
  },

  async getFlightData(flightId: string) {
    const file = path.join(this.getFlightsDir(), flightId, 'flight_data.json');
    try {
      const data = await fs.readFile(file, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  },

  async listFlights() {
    try {
      const dirs = await fs.readdir(this.getFlightsDir(), { withFileTypes: true });
      return dirs.filter(d => d.isDirectory()).map(d => d.name);
    } catch (e) {
      return [];
    }
  },

  async saveDefect(flightId: string, defect: any) {
    const dir = path.join(this.getFlightsDir(), flightId, 'defects');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, `${defect.id}.json`),
      JSON.stringify(defect, null, 2)
    );
  },

  async listDefects(flightId: string) {
    const dir = path.join(this.getFlightsDir(), flightId, 'defects');
    try {
      const files = await fs.readdir(dir);
      const defects = await Promise.all(
        files.filter(f => f.endsWith('.json')).map(async f => {
          const data = await fs.readFile(path.join(dir, f), 'utf-8');
          return JSON.parse(data);
        })
      );
      return defects;
    } catch (e) {
      return [];
    }
  }
};
