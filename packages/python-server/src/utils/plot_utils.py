import matplotlib.pyplot as plt
import platform
from matplotlib.font_manager import FontProperties

def configure_chinese_font():
    """配置中文字体，支持跨平台"""
    system = platform.system()
    
    if system == 'Darwin':  # macOS
        font_list = ['Arial Unicode MS', 'Heiti TC', 'STHeiti', 'Apple LiGothic']
    elif system == 'Windows':  # Windows
        font_list = ['Microsoft YaHei', 'SimHei', 'SimSun', 'Arial Unicode MS']
    else:  # Linux
        font_list = ['WenQuanYi Micro Hei', 'Droid Sans Fallback', 'SimHei', 'Arial Unicode MS']

    # 尝试设置字体，直到找到可用的
    font_found = False
    for font_name in font_list:
        try:
            font_prop = FontProperties(fname=None, family=font_name)
            plt.rcParams['font.family'] = font_prop.get_name()
            font_found = True
            break
        except:
            continue
    
    if not font_found:
        # 如果没有找到任何中文字体，使用默认字体
        plt.rcParams['font.family'] = 'sans-serif'
        if system == 'Windows':
            plt.rcParams['font.sans-serif'] = ['Microsoft YaHei']
        elif system == 'Darwin':
            plt.rcParams['font.sans-serif'] = ['Arial Unicode MS']
        else:
            plt.rcParams['font.sans-serif'] = ['DejaVu Sans']

    # 解决负号显示问题
    plt.rcParams['axes.unicode_minus'] = False
    
    # 设置DPI以获得更清晰的图像
    plt.rcParams['figure.dpi'] = 150 