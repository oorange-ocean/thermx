import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class RealTimeData extends Document {
  @Prop({ required: true })
  时间: string;

  @Prop({ required: true })
  机组负荷: number;

  @Prop({ required: true })
  汽轮机热耗率q: number;

  @Prop({ required: true })
  修正后热耗率q: number;

  @Prop({ required: true })
  修正系数: number;

  @Prop({ required: true })
  高压缸效率: number;

  @Prop({ required: true })
  中压缸效率: number;

  @Prop({ required: true })
  锅炉效率: number;

  @Prop({ required: true })
  厂用电率: number;

  @Prop({ required: true })
  低压缸排汽压力: number;

  @Prop({ required: true })
  一段抽汽压力: number;

  @Prop({ required: true })
  二段抽汽压力: number;

  @Prop({ required: true })
  三段抽汽压力: number;

  @Prop({ required: true })
  四段抽汽压力: number;

  @Prop({ required: true })
  中压缸排汽压力: number;

  @Prop({ required: true })
  主凝结水压力: number;

  @Prop({ required: true })
  主汽压力: number;

  @Prop({ required: true })
  高压缸排汽压力: number;

  @Prop({ required: true })
  再热减温水总管压力: number;

  @Prop({ required: true })
  再热汽压力: number;

  @Prop({ required: true })
  吹灰蒸汽压力: number;

  @Prop({ required: true })
  省煤器进口给水压力: number;

  @Prop({ required: true })
  给泵出口母管压力: number;

  @Prop({ required: true })
  主给水流量c: number;

  @Prop({ required: true })
  主给水流量: number;

  @Prop({ required: true })
  主蒸汽流量: number;

  @Prop({ required: true })
  再减流量: number;

  @Prop({ required: true })
  减温水流量: number;

  @Prop({ required: true })
  凝结水流量: number;

  @Prop({ required: true })
  凝结水补水流量: number;

  @Prop({ required: true })
  Dms: number;

  @Prop({ required: true })
  Dgp: number;

  @Prop({ required: true })
  Drh: number;

  @Prop({ required: true })
  Dmfs: number;

  @Prop({ required: true })
  D1: number;

  @Prop({ required: true })
  D2: number;

  @Prop({ required: true })
  D3: number;

  @Prop({ required: true })
  D4: number;

  @Prop({ required: true })
  '1号高加出水温度': number;

  @Prop({ required: true })
  '1号高加疏水温度': number;

  @Prop({ required: true })
  '2号高加出水温度': number;

  @Prop({ required: true })
  '2号高加疏水温度': number;

  @Prop({ required: true })
  '3号高加出水温度': number;

  @Prop({ required: true })
  '3号高加疏水温度': number;

  @Prop({ required: true })
  '3号高加进水温度': number;

  @Prop({ required: true })
  '3号高加进汽温度': number;

  @Prop({ required: true })
  一段抽汽温度: number;

  @Prop({ required: true })
  二段抽汽温度: number;

  @Prop({ required: true })
  三段抽汽温度: number;

  @Prop({ required: true })
  主蒸汽母管温度: number;

  @Prop({ required: true })
  再热减温水总管温度: number;

  @Prop({ required: true })
  再热汽母管温度: number;

  @Prop({ required: true })
  省煤器进口给水温度: number;

  @Prop({ required: true })
  除氧器下水温度1: number;

  @Prop({ required: true })
  除氧器下水温度2: number;

  @Prop({ required: true })
  除氧器进水温度: number;

  @Prop({ required: true })
  除氧器进汽温度: number;

  @Prop({ required: true })
  高压缸排汽温度: number;

  @Prop({ required: true })
  A汽泵密封水阀位: number;

  @Prop({ required: true })
  B汽泵密封水阀位: number;

  @Prop({ required: true })
  GV1阀位: number;

  @Prop({ required: true })
  GV2阀位: number;

  @Prop({ required: true })
  GV3阀位: number;

  @Prop({ required: true })
  GV4阀位: number;
}

export const RealTimeDataSchema = SchemaFactory.createForClass(RealTimeData);
