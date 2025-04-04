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
    resume: {
      type: String, // URL to resume (Cloudinary)
      required: true,
    },
    portfolio: {
      type: {
        links: [
          {
            title: { type: String },
            url: { type: String },
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
      amount: { type: Number },
      currency: { type: String, default: 'USD' },
      period: {
        type: String,
        enum: ['hourly', 'monthly', 'yearly'],
        default: 'yearly',
      },
    },
    additionalDocuments: [
      {
        title: { type: String },
        url: { type: String }, // Cloudinary URL
        type: { type: String },
      },
    ],
    notes: {
      type: String,
      default: '',
    },
    reviewNotes: {
      type: String, // For employer's internal notes
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

// Indexes for better query performance
ApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
ApplicationSchema.index({ status: 1, createdAt: -1 });
ApplicationSchema.index({ applicant: 1, createdAt: -1 });
ApplicationSchema.index({ job: 1, createdAt: -1 });

// Handle application count updates
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

// Status transition validation and handling
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

// Validation middleware
ApplicationSchema.pre('save', function (next) {
  // Validate portfolio links if they exist
  if ((this.portfolio?.links ?? []).length > 0) {
    const invalidLinks = (this.portfolio?.links ?? []).filter(
      (link) => !link.title || !link.url,
    );
    if (invalidLinks.length > 0) {
      next(new Error('Portfolio links must have both title and URL'));
      return;
    }
  }

  // Validate expected salary if it exists
  if (this.expectedSalary?.amount) {
    if (this.expectedSalary.amount <= 0) {
      next(new Error('Expected salary amount must be greater than 0'));
      return;
    }
  }

  next();
});

export interface Application {
  job: Types.ObjectId;
  applicant: Types.ObjectId;
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn';
  coverLetter: string;
  resume: string;
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
    currency: string;
    period: 'hourly' | 'monthly' | 'yearly';
  };
  additionalDocuments?: {
    title: string;
    url: string;
    type: string;
  }[];
  notes?: string;
  reviewNotes?: string;
  interviewDate?: Date | null;
  withdrawalReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ApplicationDocument = HydratedDocument<Application>;
