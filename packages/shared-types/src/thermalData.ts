// 稳态区间数据类型定义
export interface StaticStateData {
  // 基础信息
  时间: string;
  稳态区间编号: number;

  // 性能指标
  机组负荷: number;
  汽轮机热耗率q: number;
  修正后热耗率q: number;
  修正系数: number;

  // 效率相关
  高压缸效率: number;
  中压缸效率: number;
  锅炉效率: number;
  厂用电率: number;

  // 压力相关
  低压缸排汽压力: number;
  一段抽汽压力: number;
  二段抽汽压力: number;
  三段抽汽压力: number;
  四段抽汽压力: number;
  中压缸排汽压力: number;
  主凝结水压力: number;
  主汽压力: number;
  高压缸排汽压力: number;
  再热减温水总管压力: number;
  再热汽压力: number;
  吹灰蒸汽压力: number;
  省煤器进口给水压力: number;
  给泵出口母管压力: number;

  // 流量相关
  主给水流量c: number;
  主给水流量: number;
  主蒸汽流量: number;
  再减流量: number;
  减温水流量: number;
  凝结水流量: number;
  凝结水补水流量: number;

  // Dms系列
  Dms: number;
  Dgp: number;
  Drh: number;
  Dmfs: number;
  D1: number;
  D2: number;
  D3: number;
  D4: number;

  // 温度相关
  '1号高加出水温度': number;
  '1号高加疏水温度': number;
  '2号高加出水温度': number;
  '2号高加疏水温度': number;
  '3号高加出水温度': number;
  '3号高加疏水温度': number;
  '3号高加进水温度': number;
  '3号高加进汽温度': number;
  一段抽汽温度: number;
  二段抽汽温度: number;
  三段抽汽温度: number;
  主蒸汽母管温度: number;
  再热减温水总管温度: number;
  再热汽母管温度: number;
  省煤器进口给水温度: number;
  除氧器下水温度1: number;
  除氧器下水温度2: number;
  除氧器进水温度: number;
  除氧器进汽温度: number;
  高压缸排汽温度: number;

  // 阀位相关
  A汽泵密封水阀位: number;
  B汽泵密封水阀位: number;
  GV1阀位: number;
  GV2阀位: number;
  GV3阀位: number;
  GV4阀位: number;
}
