import { Request, Response } from 'express';
import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import * as crypto from 'crypto';
import { User } from '../models/user.model';
import { generateTokens } from '../utils/generateToken';
import { logAction } from '../utils/logger';

// Create client inside function or use lazy initialization
const getGoogleClient = () => {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

export const getGoogleUrl = async (req: Request, res: Response) => {
  try {

    const client = getGoogleClient();
    const codes = await client.generateCodeVerifierAsync();
    const challenge = codes.codeChallenge;
    
    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['email', 'profile'],
      code_challenge_method: CodeChallengeMethod.S256,
      code_challenge: challenge,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI
    });

    res.cookie('g_code_verifier', codes.codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    res.json({ url });
  } catch (error) {
    console.error("Google URL Error:", error);
    res.status(500).json({ message: "Failed to generate Google URL" });
  }
};


export const googleCallback = async (req: Request, res: Response) => {
  try {
    const client = getGoogleClient();
    const { code } = req.body;
    const codeVerifier = req.cookies.g_code_verifier;

    // console.log()
    if (!code || !codeVerifier) {
      return res.status(400).json({ message: "Invalid request. Missing code or verifier." });
    }

    //pkce flow to get tokens
    const { tokens } = await client.getToken({ code, codeVerifier });
   

    // Set credentials for the client
    client.setCredentials(tokens);

     // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    // Get user info from token payload
    const payload = ticket.getPayload();

    if (!payload) return res.status(400).json({ message: "Invalid Token" });

    const { email, name, sub: googleId, picture } = payload;

    let user = await User.findOne({ email });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google'; 
        await user.save();
      }
    } else {
      user = await User.create({
        name,
        email,
        googleId,
        authProvider: 'google',
        role: 'Owner',
        status: 'active',
        isVerified: true,
      });
      
      await logAction(user._id.toString(), user.name, "REGISTER_GOOGLE", "Auth", `New Google User: ${email}`, "GLOBAL");
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    res.clearCookie('g_code_verifier');

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: accessToken,
      refreshToken,
      image: picture
    });

  } catch (error) {
    console.error("Google Callback Error:", error);
    res.status(400).json({ message: "Google authentication failed" });
  }
};