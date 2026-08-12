export type ScanStackParamList = {
  ScanCapture: undefined;
  ScanMarking: { treeCode?: string; removeBackground: boolean };
  ScanProcessing: { treeCode: string };
  ScanResult: { treeCode: string };
};
