import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BrainCircuit, Briefcase, Award, FolderCode, Mail, MapPin, Link as LinkIcon, Github, Linkedin, Twitter } from "lucide-react";

async function getPublicProfileData(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      skills: { orderBy: { proficiency: "desc" } },
      projects: { orderBy: { createdAt: "desc" } },
      certificates: { orderBy: { createdAt: "desc" } },
      experiences: { orderBy: { startDate: "desc" } },
    },
  });

  return user;
}

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getPublicProfileData(id);

  if (!user) {
    notFound();
  }

  // Respect privacy toggle
  if (!user.isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full border-border bg-card/50 p-8 text-center space-y-4">
          <BrainCircuit className="size-12 mx-auto text-rose-500 animate-pulse" />
          <h2 className="text-xl font-bold text-foreground">Profile is Private</h2>
          <p className="text-sm text-muted-foreground">
            The owner has set this profile to private. Please ask them to toggle visibility in their settings.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950/20 via-background to-emerald-950/15 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Profile Card */}
        <Card className="border-border bg-card/40 backdrop-blur-md p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            {user.image ? (
              <img src={user.image} alt={user.name || "User"} className="w-24 h-24 rounded-full border-2 border-emerald-500/30 object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center text-3xl font-bold text-emerald-400">
                {user.name ? user.name[0].toUpperCase() : "?"}
              </div>
            )}
            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold text-foreground">{user.name || "Professional Profile"}</h1>
              {user.headline && <p className="text-lg font-medium text-emerald-400">{user.headline}</p>}
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-muted-foreground pt-1">
                {user.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {user.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5" />
                  {user.email}
                </span>
                {user.website && (
                  <a href={user.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-emerald-400">
                    <LinkIcon className="size-3.5" />
                    Portfolio
                  </a>
                )}
              </div>
            </div>
          </div>

          {user.bio && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <h2 className="text-sm font-semibold text-foreground">About</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{user.bio}</p>
            </div>
          )}

          {/* Socials */}
          <div className="flex items-center gap-3 pt-2">
            {user.github && (
              <a href={`https://github.com/${user.github}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-secondary hover:text-emerald-400 transition-colors">
                <Github className="size-4" />
              </a>
            )}
            {user.linkedin && (
              <a href={`https://linkedin.com/in/${user.linkedin}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-secondary hover:text-emerald-400 transition-colors">
                <Linkedin className="size-4" />
              </a>
            )}
            {user.twitter && (
              <a href={`https://twitter.com/${user.twitter}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-secondary hover:text-emerald-400 transition-colors">
                <Twitter className="size-4" />
              </a>
            )}
          </div>
        </Card>

        {/* Skills Graph summary */}
        {user.skills.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BrainCircuit className="size-5 text-emerald-400" />
              Verified Skills ({user.skills.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {user.skills.map((skill) => (
                <Card key={skill.id} className="border-border bg-card/30 p-4 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-sm">{skill.name}</h3>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground mt-1 border-border">
                      {skill.category}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Proficiency</span>
                      <span className="font-semibold text-emerald-400">{skill.proficiency}%</span>
                    </div>
                    <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${skill.proficiency}%` }} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {user.experiences.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Briefcase className="size-5 text-sky-400" />
              Experience
            </h2>
            <div className="space-y-4">
              {user.experiences.map((exp) => (
                <Card key={exp.id} className="border-border bg-card/30 p-5 space-y-2">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                    <h3 className="font-bold text-sm text-foreground">{exp.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {new Date(exp.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                      {exp.endDate ? ` – ${new Date(exp.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}` : ' – Present'}
                    </span>
                  </div>
                  {exp.company && <p className="text-xs text-emerald-400 font-medium">{exp.company}</p>}
                  {exp.description && <p className="text-xs text-muted-foreground leading-relaxed pt-1">{exp.description}</p>}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {user.projects.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FolderCode className="size-5 text-amber-400" />
              Featured Projects
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {user.projects.map((proj) => {
                let techList: string[] = [];
                try {
                  techList = JSON.parse(proj.technologies);
                } catch {}

                return (
                  <Card key={proj.id} className="border-border bg-card/30 p-5 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-sm">{proj.name}</h3>
                        <Badge variant="outline" className="text-[10px] uppercase border-border text-muted-foreground">
                          {proj.complexity}
                        </Badge>
                      </div>
                      {proj.description && <p className="text-xs text-muted-foreground leading-relaxed">{proj.description}</p>}
                    </div>

                    <div className="space-y-3">
                      {techList.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {techList.map((tech) => (
                            <Badge key={tech} variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3">
                        {proj.githubUrl && (
                          <a href={proj.githubUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-emerald-400 flex items-center gap-1">
                            <Github className="size-3.5" />
                            GitHub
                          </a>
                        )}
                        {proj.liveUrl && (
                          <a href={proj.liveUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-emerald-400 flex items-center gap-1">
                            <LinkIcon className="size-3.5" />
                            Live Demo
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Certificates */}
        {user.certificates.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Award className="size-5 text-purple-400" />
              Certifications
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {user.certificates.map((cert) => (
                <Card key={cert.id} className="border-border bg-card/30 p-4 space-y-2">
                  <h3 className="font-bold text-sm">{cert.title}</h3>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{cert.issuingOrg || "Verified Certificate"}</span>
                    {cert.completionDate && (
                      <span>{new Date(cert.completionDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
