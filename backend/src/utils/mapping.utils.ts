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
