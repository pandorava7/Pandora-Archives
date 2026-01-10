"use client"

// 1. React 核心
import React from 'react';

// 2. Next.js 核心与内置组件

// 3. 第三方库

// 4. 常量

// 5. 项目内资源文件

// 6. 样式和组件
import styles from './example.module.css';



const ExampleClient: React.FC = () => {

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>模块化 CSS 示例</h1>
            <p className={styles.desc}>
                这是一个示例界面。样式通过 CSS Module 隔离作用域，避免命名冲突。
            </p>

            <div className={styles.card}>
                <div className={styles.cardHeader}>卡片标题</div>
                <div className={styles.cardBody}>
                    这里是卡片内容，可以放一些文本或组件。
                </div>
                <button className={styles.button}>操作按钮</button>
            </div>
        </div>
    );
};

export default ExampleClient;