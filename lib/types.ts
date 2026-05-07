export type TaskStatus = "todo" | "in_progress" | "done";

export interface Profile {
  id: string;
  display_name: string;
  email: string;
}

export interface Bucket {
  id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

export interface Task {
  id: string;
  bucket_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  position: number;
  created_at: string;
  updated_at: string;
  assignee?: Profile | null;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: Profile | null;
}

export interface Vendor {
  id: string;
  name: string;
  category: string | null;
  contact_info: string | null;
  notes: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "id">;
        Update: Partial<Omit<Profile, "id">>;
      };
      buckets: {
        Row: Bucket;
        Insert: Omit<Bucket, "id" | "created_at">;
        Update: Partial<Omit<Bucket, "id" | "created_at">>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "updated_at" | "assignee" | "comments">;
        Update: Partial<Omit<Task, "id" | "created_at" | "updated_at" | "assignee" | "comments">>;
      };
      comments: {
        Row: Comment;
        Insert: Omit<Comment, "id" | "created_at" | "author">;
        Update: Partial<Omit<Comment, "id" | "created_at" | "author">>;
      };
      vendors: {
        Row: Vendor;
        Insert: Omit<Vendor, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Vendor, "id" | "created_at" | "updated_at">>;
      };
      budget: {
        Row: Budget;
        Insert: Omit<Budget, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Budget, "id" | "created_at" | "updated_at">>;
      };
    };
  };
};
