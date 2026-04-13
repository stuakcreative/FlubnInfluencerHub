with open('/src/app/pages/InfluencerPublicProfile.tsx', 'r') as f:
    content = f.read()

old = '''                          <motion.div
                            key={badge.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.08 + i * 0.05, type: "spring", stiffness: 200 }}
                            className="flex flex-col items-center gap-2 text-center"
                            style={badge.id === "tb7" ? { gridColumn: 2 } : undefined}
                          >
                            {/* Medallion */}
                            <div className="relative">
                              <div
                                className="w-[52px] h-[52px] rounded-full flex items-center justify-center"
                                style={{
                                  background: `radial-gradient(circle at 38% 35%, ${badge.color}55, ${badge.color}1a)`,
                                  border: `2px solid ${badge.color}60`,
                                  boxShadow: `0 0 0 5px ${badge.color}10, 0 6px 20px ${badge.color}35`,
                                }}
                              >
                                {BadgeIcon && <BadgeIcon size={22} style={{ color: badge.color }} />}
                              </div>
                              {/* Verified stamp */}
                              <div
                                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
                                style={{ backgroundColor: badge.color }}
                              >
                                <CheckCircle size={10} className="text-white" />
                              </div>
                            </div>

                            {/* Label */}
                            <div className="flex justify-center w-full">
                              <p className="text-[10px] text-[#334155] leading-tight text-center break-words max-w-full">{badge.name}</p>

                            </div>
                          </motion.div>'''

print(repr(old[:100]))
print("Found:", old in content)

# Find the actual line
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'key={badge.id}' in line:
        print(f"Line {i+1}: {repr(line)}")
        break
