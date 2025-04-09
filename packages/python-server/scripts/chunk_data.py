import pandas as pd
import os
import json
import argparse
import logging
from math import ceil

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("data-chunking")

def chunk_data_file(file_path, output_dir, chunk_prefix, chunk_size=5000):
    """
    将大型CSV文件分割成多个小文件
    
    Args:
        file_path: CSV文件路径
        output_dir: 输出目录
        chunk_prefix: 分片文件名前缀
        chunk_size: 每个分片的行数
    
    Returns:
        total_chunks: 总分片数量
    """
    try:
        logger.info(f"开始分片文件: {file_path}")
        
        # 确保输出目录存在
        os.makedirs(output_dir, exist_ok=True)
        
        # 使用pandas读取CSV（可处理大文件）
        chunksize = chunk_size
        reader = pd.read_csv(file_path, chunksize=chunksize)
        
        chunk_id = 0
        total_rows = 0
        
        for chunk in reader:
            output_path = os.path.join(output_dir, f"{chunk_prefix}_{chunk_id}.csv")
            chunk.to_csv(output_path, index=False)
            chunk_id += 1
            total_rows += len(chunk)
            logger.info(f"已写入分片 {chunk_id}，包含 {len(chunk)} 行")
        
        # 创建元数据文件
        metadata = {
            "totalChunks": chunk_id,
            "totalRows": total_rows,
            "chunkSize": chunk_size,
            "sourceFile": os.path.basename(file_path)
        }
        
        metadata_path = os.path.join(output_dir, f"{chunk_prefix}_metadata.json")
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"分片完成: 共 {chunk_id} 个分片，{total_rows} 行数据")
        return chunk_id
    
    except Exception as e:
        logger.error(f"分片过程出错: {str(e)}")
        raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CSV数据分片工具")
    parser.add_argument("--file", required=True, help="要分片的CSV文件路径")
    parser.add_argument("--output", required=True, help="分片文件输出目录")
    parser.add_argument("--prefix", required=True, help="分片文件名前缀")
    parser.add_argument("--size", type=int, default=5000, help="每个分片的行数")
    
    args = parser.parse_args()
    
    chunk_data_file(args.file, args.output, args.prefix, args.size) 