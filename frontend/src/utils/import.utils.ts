import * as XLSX from 'xlsx';

export type MappingSchema = Record<string, string[] | ((row: any) => any)>;

export const mapImportData = (rawData: any[], schema: MappingSchema): any[] => {
  return rawData.map((row) => {
    const mapped: any = {};

    Object.entries(schema).forEach(([targetKey, sourceInfo]) => {
      if (typeof sourceInfo === 'function') {
        mapped[targetKey] = sourceInfo(row);
      } else {
        const sourceKey = Object.keys(row).find((k) =>
          sourceInfo.some(header => header.toLowerCase() === k.toLowerCase().trim())
        );
        mapped[targetKey] = sourceKey !== undefined ? row[sourceKey] : undefined;
      }
    });

    return mapped;
  });
};

export const parseImportFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          resolve(Array.isArray(content) ? content : [content]);
        } catch (err) {
          reject(new Error('Помилка парсингу JSON'));
        }
      };
      reader.onerror = () => reject(new Error('Помилка читання файлу'));
      reader.readAsText(file);
    } else if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          resolve(XLSX.utils.sheet_to_json(worksheet));
        } catch (err) {
          reject(new Error('Помилка парсингу Excel/CSV'));
        }
      };
      reader.onerror = () => reject(new Error('Помилка читання файлу'));
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('Непідтримуваний формат файлу. Використовуйте .xlsx, .csv або .json'));
    }
  });
};
