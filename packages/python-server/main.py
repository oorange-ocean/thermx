from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
import logging
from typing import List, Dict, Any
import uvicorn
import traceback
from scripts.chunk_data import chunk_data_file

app = FastAPI(title="热力数据处理API")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制为前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("thermal-python-main")

# 获取数据目录（与现有逻辑保持一致）
def get_data_dir():
    data_dir = os.environ.get("DATA_DIR")
    if data_dir:
        logger.info(f"使用环境变量定义的数据目录: {data_dir}")
        return data_dir
    
    env = os.environ.get("NODE_ENV", "development")
    if env == "production":
        logger.info("使用生产环境数据目录: /home/data")
        return "/home/data"
    else:
        data_dir = os.path.join(os.getcwd(), "data")
        logger.info(f"使用开发环境数据目录: {data_dir}")
        return data_dir

@app.get("/")
async def root():
    return {"message": "热力数据处理API服务运行中"}

@app.get("/steady-state-data/{chunk_id}")
async def get_steady_state_data_chunk(chunk_id: int):
    """获取稳态数据分片"""
    try:
        data_dir = get_data_dir()
        chunk_path = os.path.join(data_dir, "chunks", f"steady_state_chunk_{chunk_id}.csv")
        
        if not os.path.exists(chunk_path):
            raise HTTPException(status_code=404, detail=f"数据分片 {chunk_id} 不存在于 chunks 目录")
            
        df = pd.read_csv(chunk_path)
        df = df.astype(object).where(pd.notna(df), None)
        return df.to_dict(orient="records")
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"获取稳态数据分片 {chunk_id} 时发生意外错误: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"处理稳态数据分片时发生内部错误")

@app.get("/steady-state-data-metadata")
async def get_steady_state_metadata():
    """获取稳态数据元数据"""
    try:
        data_dir = get_data_dir()
        metadata_path = os.path.join(data_dir, "chunks", "steady_state_metadata.json")
        chunks_dir = os.path.join(data_dir, "chunks")

        if not os.path.exists(metadata_path):
            if not os.path.isdir(chunks_dir):
                logger.warning(f"Chunks 目录 {chunks_dir} 不存在，无法计算分片数量。")
                return {"totalChunks": 0}

            return {"totalChunks": count_chunks(chunks_dir, "steady_state_chunk_")}
            
        with open(metadata_path, "r") as f:
            import json
            return json.load(f)
    except Exception as e:
        logger.error(f"获取稳态数据元数据失败: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="获取稳态数据元数据时发生内部错误")

def count_chunks(target_dir: str, prefix: str) -> int:
    """计算指定目录下特定前缀的分片数量"""
    count = 0
    if not os.path.isdir(target_dir):
        logger.warning(f"尝试计数的目录不存在: {target_dir}")
        return 0
    for file in os.listdir(target_dir):
        if file.startswith(prefix) and file.endswith(".csv"):
            count += 1
    return count

# 添加clustering数据的API
@app.get("/clustering-data/{chunk_id}")
async def get_clustering_data_chunk(chunk_id: int):
    """获取聚类数据分片"""
    try:
        data_dir = get_data_dir()
        chunk_path = os.path.join(data_dir, "chunks", f"clustering_chunk_{chunk_id}.csv")
        
        if not os.path.exists(chunk_path):
            raise HTTPException(status_code=404, detail=f"数据分片 {chunk_id} 不存在于 chunks 目录")
            
        df = pd.read_csv(chunk_path)
        df = df.astype(object).where(pd.notna(df), None)
        return df.to_dict(orient="records")
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"获取聚类数据分片 {chunk_id} 时发生意外错误: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"处理聚类数据分片时发生内部错误")

@app.get("/clustering-data-metadata")
async def get_clustering_metadata():
    """获取聚类数据元数据"""
    try:
        data_dir = get_data_dir()
        metadata_path = os.path.join(data_dir, "chunks", "clustering_metadata.json")
        chunks_dir = os.path.join(data_dir, "chunks")

        if not os.path.exists(metadata_path):
            if not os.path.isdir(chunks_dir):
                logger.warning(f"Chunks 目录 {chunks_dir} 不存在，无法计算分片数量。")
                return {"totalChunks": 0}

            return {"totalChunks": count_chunks(chunks_dir, "clustering_chunk_")}
            
        with open(metadata_path, "r") as f:
            import json
            return json.load(f)
    except Exception as e:
        logger.error(f"获取聚类数据元数据失败: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="获取聚类数据元数据时发生内部错误")

# 数据处理端点 - 示例
@app.get("/analyze/heat-rate")
async def analyze_heat_rate():
    """热耗率分析"""
    try:
        # 这里可以添加您的Python数据分析代码
        # 例如使用pandas、numpy、scikit-learn等
        result = {"status": "success", "message": "热耗率分析完成"}
        return result
    except Exception as e:
        logger.error(f"热耗率分析失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def run_chunking():
    """执行数据分片"""
    logger.info("开始执行数据分片...")
    try:
        data_dir = get_data_dir()
        raw_data_dir = data_dir
        output_dir = os.path.join(data_dir, "chunks")

        os.makedirs(output_dir, exist_ok=True)
        logger.info(f"确保分片输出目录存在: {output_dir}")

        files_to_chunk = [
            {"source": "steady_state_data.csv", "prefix": "steady_state_chunk"},
            {"source": "clustering_data.csv", "prefix": "clustering_chunk"},
        ]

        for config in files_to_chunk:
            source_path = os.path.join(raw_data_dir, config["source"])
            metadata_path = os.path.join(output_dir, f"{config['prefix']}_metadata.json")

            if os.path.exists(source_path):
                if not os.path.exists(metadata_path):
                    logger.info(f"找到原始数据文件: {config['source']}，且元数据不存在，开始分片...")
                    chunk_data_file(
                        file_path=source_path,
                        output_dir=output_dir,
                        chunk_prefix=config["prefix"],
                        chunk_size=5000
                    )
                else:
                    logger.info(f"分片元数据文件 {os.path.basename(metadata_path)} 已在 {output_dir} 存在，跳过分片。")
            else:
                logger.warning(f"未找到原始数据文件: {source_path}，无法进行分片。")

        logger.info("数据分片执行完毕。")

    except Exception as e:
        logger.error(f"数据分片过程中发生错误: {traceback.format_exc()}")

if __name__ == "__main__":
    run_chunking()

    port = int(os.environ.get("PORT", 5001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True) 