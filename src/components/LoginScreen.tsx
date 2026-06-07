setTimeout(() => {
  const users = getRegisteredUsers();
  const targetUser = users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );

  if (!targetUser) {
    setError("AUTHENTICATION FAILED: Operator profile not found in directory.");
    setIsSubmitting(false);
    return;
  }

  if (targetUser.password !== password) {
    setError("PROTOCOL MISMATCH: Invalid password signature. Access denied.");
    setIsSubmitting(false);
    return;
  }

  if (!targetUser.verified) {
    setPendingEmail(targetUser.email);
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setActivationToken(randomCode);
    setMode("verify");
    setError("SIGN-UP UNVERIFIED: Enter activation credentials to proceed.");
    setIsSubmitting(false);
    return;
  }

  const userInitials = targetUser.email.split("@")[0].toUpperCase();
  onLogin({
    email: targetUser.email,
    id: `OP_${userInitials.substring(0, 6)}_${Math.floor(10 + Math.random() * 89)}`,
    name: userInitials.replace(/[._-]/g, " "),
    role: "LEAD_OPERATOR",
    sessionToken: `SESSION_${Math.random().toString(36).substring(2, 10).toUpperCase()}`
  });
  setIsSubmitting(false);
}, 850);