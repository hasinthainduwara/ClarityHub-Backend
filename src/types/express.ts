import { IUser } from "../models/User";

// Extend Express Request globally
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
