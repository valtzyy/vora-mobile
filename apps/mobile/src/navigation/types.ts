export type ScanStackParamList = {
  ScanCapture: undefined;
  ScanMarking: { treeCode?: string; removeBackground: boolean };
  ScanProcessing: { treeCode: string };
  ScanResult: { treeCode: string };
};

export type GalleryStackParamList = {
  GalleryList: undefined;
  ScanResult: { treeCode: string };
};

export type PlotsStackParamList = {
  PlotsList: undefined;
  PlotDetail: { plotCode: string };
  CreatePlot: undefined;
};
