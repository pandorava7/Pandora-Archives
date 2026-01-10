// 定义用户数据的类型
export interface UserData {
  name: string;
  avatarUrl: string;
  role?: string; // 可选属性，比如管理员、博主
  level?: number;
}