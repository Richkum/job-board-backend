import { HydratedDocument, Schema, Types } from 'mongoose';

export const ApplicationSchema = new Schema(
  {
    job: {
      type: Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    applicant: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
    },
    coverLetter: {
      type: String,
      required: true,
      minlength: [100, 'Cover letter must be at least 100 characters long'],
    },
    // Modified resume field to handle multiple formats
    resumeInfo: {
      type: {
        format: {
          type: String,
          enum: ['link', 'text', 'file'],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        // For external links (LinkedIn, Google Drive, etc.)
        source: {
          type: String,
          enum: ['linkedin', 'github', 'drive', 'dropbox', 'other', null],
          default: null,
        },
        // Original filename if it's a file
        fileName: String,
        // MIME type if it's a file
        mimeType: String,
      },
      required: true,
    },
    portfolio: {
      type: {
        links: [
          {
            title: {
              type: String,
              required: true,
            },
            url: {
              type: String,
              required: true,
              validate: {
                validator: function (v: string) {
                  try {
                    new URL(v);
                    return true;
                  } catch (e) {
                    return false;
                  }
                },
                message: 'Please provide a valid URL',
              },
            },
            description: { type: String },
          },
        ],
      },
      default: {},
    },
    relevantExperience: {
      type: [String],
      default: [],
    },
    expectedSalary: {
      amount: {
        type: Number,
        validate: {
          validator: function (v: number) {
            return v > 0;
          },
          message: 'Expected salary amount must be greater than 0',
        },
      },
      currency: {
        type: String,
        default: 'USD',
        enum: ['USD', 'EUR', 'GBP', 'FCFA'],
      },
      period: {
        type: String,
        enum: ['hourly', 'monthly', 'yearly'],
        default: 'yearly',
      },
    },
    // Modified to support multiple link types instead of files
    additionalMaterials: [
      {
        title: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ['link', 'certificate', 'portfolio', 'project', 'other'],
          required: true,
        },
        url: {
          type: String,
          required: true,
          validate: {
            validator: function (v: string) {
              try {
                new URL(v);
                return true;
              } catch (e) {
                return false;
              }
            },
            message: 'Please provide a valid URL',
          },
        },
        description: { type: String },
      },
    ],
    professionalProfiles: {
      linkedin: {
        type: String,
        validate: {
          validator: function (v: string) {
            return !v || v.includes('linkedin.com/');
          },
          message: 'Please provide a valid LinkedIn URL',
        },
      },
      github: {
        type: String,
        validate: {
          validator: function (v: string) {
            return !v || v.includes('github.com/');
          },
          message: 'Please provide a valid GitHub URL',
        },
      },
      website: {
        type: String,
        validate: {
          validator: function (v: string) {
            try {
              if (!v) return true;
              new URL(v);
              return true;
            } catch (e) {
              return false;
            }
          },
          message: 'Please provide a valid URL',
        },
      },
    },
    notes: {
      type: String,
      default: '',
    },
    reviewNotes: {
      type: String,
      default: '',
    },
    interviewDate: {
      type: Date,
      default: null,
    },
    withdrawalReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

// Keep existing indexes
ApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
ApplicationSchema.index({ status: 1, createdAt: -1 });
ApplicationSchema.index({ applicant: 1, createdAt: -1 });
ApplicationSchema.index({ job: 1, createdAt: -1 });

// Keep existing application count updates middleware
ApplicationSchema.pre('save', async function (next) {
  if (this.isNew) {
    const Job = this.model('Job');
    await Job.findByIdAndUpdate(this.job, { $inc: { applicationCount: 1 } });
  }
  next();
});

ApplicationSchema.pre('findOneAndUpdate', async function (next) {
  const docToUpdate = await this.model.findOne(this.getQuery());
  if (
    docToUpdate &&
    this.get('status') === 'withdrawn' &&
    docToUpdate.status !== 'withdrawn'
  ) {
    const Job = new this.model('Job');
    await Job.findByIdAndUpdate(docToUpdate.job, {
      $inc: { applicationCount: -1 },
    });
  }
  next();
});

ApplicationSchema.pre(
  'deleteOne',
  { document: true, query: false },
  async function () {
    if (this.status !== 'withdrawn') {
      const Job = this.model('Job');
      await Job.findByIdAndUpdate(this.job, { $inc: { applicationCount: -1 } });
    }
  },
);

// Keep existing status transition validation
ApplicationSchema.methods.updateStatus = function (
  newStatus: 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn',
  notes?: string,
) {
  const validTransitions: Record<
    string,
    Array<'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn'>
  > = {
    pending: ['reviewing', 'rejected', 'withdrawn'],
    reviewing: ['accepted', 'rejected', 'withdrawn'],
    accepted: ['withdrawn'],
    rejected: [],
    withdrawn: [],
  };

  if (!validTransitions[this.status]?.includes(newStatus)) {
    throw new Error(
      `Invalid status transition from ${this.status} to ${newStatus}`,
    );
  }

  this.status = newStatus;
  if (notes) {
    if (newStatus === 'withdrawn') {
      this.withdrawalReason = notes;
    } else {
      this.reviewNotes = notes;
    }
  }
};

// Updated interface to match schema changes
export interface Application {
  job: Types.ObjectId;
  applicant: Types.ObjectId;
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn';
  coverLetter: string;
  resumeInfo: {
    format: 'link' | 'text' | 'file';
    content: string;
    source: 'linkedin' | 'github' | 'drive' | 'dropbox' | 'other' | null;
    fileName?: string;
    mimeType?: string;
  };
  portfolio?: {
    links: {
      title: string;
      url: string;
      description?: string;
    }[];
  };
  relevantExperience: string[];
  expectedSalary?: {
    amount: number;
    currency: 'USD' | 'EUR' | 'GBP' | 'FCFA' | 'NGN' | 'GHC';
    period: 'hourly' | 'monthly' | 'yearly';
  };
  additionalMaterials?: {
    title: string;
    type: 'link' | 'certificate' | 'portfolio' | 'project' | 'other';
    url: string;
    description?: string;
  }[];
  professionalProfiles?: {
    linkedin?: string;
    github?: string;
    website?: string;
  };
  notes?: string;
  reviewNotes?: string;
  interviewDate?: Date | null;
  withdrawalReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ApplicationDocument = HydratedDocument<Application>;
